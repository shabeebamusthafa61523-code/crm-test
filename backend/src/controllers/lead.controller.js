import Lead from '../models/lead.model.js';
import LeadFollowup from '../models/leadFollowup.model.js';
import User from '../models/user.model.js';
import mongoose from 'mongoose';

export const leadController = {
  /**
   * GET /api/v1/leads
   * Get all leads with status, search, and user-role filters
   */
  getLeads: async (req, res) => {
    try {
      const { status, search, assignedTo, priority, city, dateFrom, dateTo, sortOrder } = req.query;

      // Base query
      const whereClause = {};

      // Role check: Employee role (role_id === '3' or role === 'employee')
      // can only view leads assigned to them.
      const userRole = String(req.user?.role || req.user?.role_id || '').toLowerCase().trim();
      const userId = req.user?.id || req.user?._id;

      if (userRole === '3' || userRole === 'employee') {
        whereClause.assignedTo = userId;
      } else if (assignedTo) {
        // Admin or HR filtering by staff member
        if (mongoose.Types.ObjectId.isValid(assignedTo)) {
          whereClause.assignedTo = assignedTo;
        }
      }

      // Filter by Status
      if (status && status !== 'all') {
        if (status === 'assigned') {
          whereClause.assignedTo = { $ne: null };
        } else if (status === 'follow-up') {
          whereClause.nextFollowUpDate = { $exists: true, $ne: null };
          whereClause.status = 'Follow Up';
        } else if (status === 'converted') {
          whereClause.status = 'Converted';
        } else if (status === 'lost') {
          whereClause.status = 'Lost';
        } else {
          whereClause.status = status;
        }
      }

      // Filter by Priority
      if (priority && priority !== 'all') {
        whereClause.priority = priority;
      }

      // Filter by City (dedicated city dropdown filter)
      if (city && city !== 'all') {
        whereClause.city = { $regex: `^${city.trim()}$`, $options: 'i' };
      }

      // Filter by Date Range on createdAt
      if (dateFrom || dateTo) {
        whereClause.createdAt = {};
        if (dateFrom) {
          whereClause.createdAt.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          const endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999);
          whereClause.createdAt.$lte = endDate;
        }
      }

      // Filter by Search text
      if (search) {
        whereClause.$or = [
          { leadName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { companyName: { $regex: search, $options: 'i' } },
          { city: { $regex: search, $options: 'i' } },
          { source: { $regex: search, $options: 'i' } },
          { interestedService: { $regex: search, $options: 'i' } }
        ];
      }

      // Sort direction: default newest first
      const sortDirection = sortOrder === 'asc' ? 1 : -1;

      const leads = await Lead.find(whereClause)
        .populate('assignedTo', 'name email role profile_image')
        .populate('createdBy', 'name email')
        .sort({ createdAt: sortDirection });

      return res.status(200).json({
        success: true,
        data: leads
      });
    } catch (error) {
      console.error('Error fetching leads:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch leads',
        error: error.message
      });
    }
  },

  /**
   * GET /api/v1/leads/:id
   * Get single lead by ID with populated assignment and followups list
   */
  getLeadById: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Lead ID'
        });
      }

      const lead = await Lead.findById(id)
        .populate('assignedTo', 'name email role profile_image')
        .populate('createdBy', 'name email');

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      // Permissions check
      const userRole = String(req.user?.role || req.user?.role_id || '').toLowerCase().trim();
      const userId = req.user?.id || req.user?._id;
      if ((userRole === '3' || userRole === 'employee') && String(lead.assignedTo?._id || lead.assignedTo) !== String(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied. You are not assigned to this lead.'
        });
      }

      // Fetch followups
      const followups = await LeadFollowup.find({ leadId: id })
        .populate('createdBy', 'name email role')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        data: {
          lead,
          followups
        }
      });
    } catch (error) {
      console.error('Error fetching lead details:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch lead details',
        error: error.message
      });
    }
  },

  /**
   * POST /api/v1/leads/create
   * Add a single new lead
   */
  createLead: async (req, res) => {
    try {
      const {
        leadName,
        companyName,
        email,
        phone,
        city,
        source,
        interestedService,
        assignedTo,
        status,
        priority,
        remarks,
        nextFollowUpDate
      } = req.body;

      if (!leadName || !phone) {
        return res.status(400).json({
          success: false,
          message: 'Lead Name and Phone Number are required fields.'
        });
      }

      const createdById = req.user?.id || req.user?._id;

      const newLead = new Lead({
        leadName,
        companyName,
        email,
        phone,
        city,
        source,
        interestedService,
        assignedTo: mongoose.Types.ObjectId.isValid(assignedTo) ? assignedTo : null,
        status: status || 'New',
        priority: priority || 'Medium',
        remarks,
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
        createdBy: createdById
      });

      if (newLead.status === 'Converted') {
        newLead.convertedAt = new Date();
      }

      await newLead.save();

      // Create an initial followup log tracking the lead creation
      const initialFollowup = new LeadFollowup({
        leadId: newLead._id,
        remarks: remarks || 'Lead created in CRM.',
        statusChangedTo: newLead.status,
        nextFollowUpDate: newLead.nextFollowUpDate,
        createdBy: createdById
      });
      await initialFollowup.save();

      return res.status(201).json({
        success: true,
        message: 'Lead created successfully',
        data: newLead
      });
    } catch (error) {
      console.error('Error creating lead:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create lead',
        error: error.message
      });
    }
  },

  /**
   * POST /api/v1/leads/update
   * PUT /api/v1/leads/update/:id
   * Update lead details
   */
  updateLead: async (req, res) => {
    try {
      const id = req.params.id || req.body.id || req.body._id;

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Valid Lead ID is required for update.'
        });
      }

      const lead = await Lead.findById(id);
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      // Permissions check
      const userRole = String(req.user?.role || req.user?.role_id || '').toLowerCase().trim();
      const userId = req.user?.id || req.user?._id;
      if ((userRole === '3' || userRole === 'employee') && String(lead.assignedTo) !== String(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied. You cannot update this lead.'
        });
      }

      const {
        leadName,
        companyName,
        email,
        phone,
        city,
        source,
        interestedService,
        assignedTo,
        status,
        priority,
        remarks,
        nextFollowUpDate,
        lostReason
      } = req.body;

      const previousStatus = lead.status;
      const previousAssignment = lead.assignedTo;

      // Update fields
      if (leadName !== undefined) lead.leadName = leadName;
      if (companyName !== undefined) lead.companyName = companyName;
      if (email !== undefined) lead.email = email;
      if (phone !== undefined) lead.phone = phone;
      if (city !== undefined) lead.city = city;
      if (source !== undefined) lead.source = source;
      if (interestedService !== undefined) lead.interestedService = interestedService;
      if (priority !== undefined) lead.priority = priority;
      if (remarks !== undefined) lead.remarks = remarks;
      if (nextFollowUpDate !== undefined) lead.nextFollowUpDate = nextFollowUpDate ? new Date(nextFollowUpDate) : null;

      // Only Admin/HR can assign/reassign leads (or assigned user if allowed, let's keep it open but track history)
      if (assignedTo !== undefined) {
        lead.assignedTo = mongoose.Types.ObjectId.isValid(assignedTo) ? assignedTo : null;
      }

      if (status !== undefined) {
        lead.status = status;
        if (status === 'Converted' && previousStatus !== 'Converted') {
          lead.convertedAt = new Date();
          lead.lostReason = undefined;
        } else if (status === 'Lost') {
          lead.lostReason = lostReason || 'Not specified';
          lead.convertedAt = undefined;
        } else {
          lead.convertedAt = undefined;
          lead.lostReason = undefined;
        }
      }

      await lead.save();

      // Log status/assignment changes in follow-up history if something changed
      const changes = [];
      if (status && status !== previousStatus) {
        changes.push(`Status changed from "${previousStatus}" to "${status}"`);
      }
      if (assignedTo !== undefined && String(assignedTo || '') !== String(previousAssignment || '')) {
        let staffName = 'Unassigned';
        if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
          const staff = await User.findById(assignedTo);
          staffName = staff ? staff.name : 'Unknown Staff';
        }
        changes.push(`Lead assigned to "${staffName}"`);
      }

      if (changes.length > 0) {
        const changeFollowup = new LeadFollowup({
          leadId: lead._id,
          remarks: `Lead updated. ${changes.join('. ')}.`,
          statusChangedTo: status || lead.status,
          nextFollowUpDate: lead.nextFollowUpDate,
          createdBy: userId
        });
        await changeFollowup.save();
      }

      return res.status(200).json({
        success: true,
        message: 'Lead updated successfully',
        data: lead
      });
    } catch (error) {
      console.error('Error updating lead:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update lead',
        error: error.message
      });
    }
  },

  /**
   * POST /api/v1/leads/followup
   * Add a follow-up interaction note and optionally update status/next date
   */
  addFollowUp: async (req, res) => {
    try {
      const leadId = req.body.leadId || req.body.id || req.params.id;
      const {
        remarks,
        nextFollowUpDate,
        callSummary,
        meetingNotes,
        statusChangedTo
      } = req.body;

      if (!leadId || !mongoose.Types.ObjectId.isValid(leadId)) {
        return res.status(400).json({
          success: false,
          message: 'Valid Lead ID is required to add follow-up.'
        });
      }

      if (!remarks && !callSummary && !meetingNotes && !statusChangedTo) {
        return res.status(400).json({
          success: false,
          message: 'At least one follow-up field (remarks, call summary, meeting notes, status) is required.'
        });
      }

      const lead = await Lead.findById(leadId);
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      const createdById = req.user?.id || req.user?._id;

      // Save Followup Document
      const followup = new LeadFollowup({
        leadId,
        remarks: remarks || 'Follow-up logged.',
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
        callSummary,
        meetingNotes,
        statusChangedTo: statusChangedTo || lead.status,
        createdBy: createdById
      });
      await followup.save();

      // Update Lead Status / Remarks / Followup dates
      if (statusChangedTo) {
        const previousStatus = lead.status;
        lead.status = statusChangedTo;
        if (statusChangedTo === 'Converted' && previousStatus !== 'Converted') {
          lead.convertedAt = new Date();
          lead.lostReason = undefined;
        } else if (statusChangedTo === 'Lost') {
          lead.lostReason = req.body.lostReason || 'Not specified';
          lead.convertedAt = undefined;
        }
      }

      if (nextFollowUpDate !== undefined) {
        lead.nextFollowUpDate = nextFollowUpDate ? new Date(nextFollowUpDate) : null;
      }
      if (remarks) {
        lead.remarks = remarks;
      }

      await lead.save();

      return res.status(201).json({
        success: true,
        message: 'Follow-up logged successfully',
        data: followup
      });
    } catch (error) {
      console.error('Error adding follow-up:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to record follow-up',
        error: error.message
      });
    }
  },

  /**
   * POST /api/v1/leads/status-update
   * Directly update lead status and record history
   */
  updateStatus: async (req, res) => {
    try {
      const leadId = req.body.leadId || req.body.id || req.params.id;
      const { status, lostReason } = req.body;

      if (!leadId || !mongoose.Types.ObjectId.isValid(leadId)) {
        return res.status(400).json({
          success: false,
          message: 'Valid Lead ID is required.'
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required.'
        });
      }

      const lead = await Lead.findById(leadId);
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      const previousStatus = lead.status;
      lead.status = status;

      if (status === 'Converted' && previousStatus !== 'Converted') {
        lead.convertedAt = new Date();
        lead.lostReason = undefined;
      } else if (status === 'Lost') {
        lead.lostReason = lostReason || 'Not specified';
        lead.convertedAt = undefined;
      } else {
        lead.convertedAt = undefined;
        lead.lostReason = undefined;
      }

      await lead.save();

      const createdById = req.user?.id || req.user?._id;

      // Log the direct status update as a followup history event
      const followup = new LeadFollowup({
        leadId,
        remarks: `Status updated directly from "${previousStatus}" to "${status}".`,
        statusChangedTo: status,
        nextFollowUpDate: lead.nextFollowUpDate,
        createdBy: createdById
      });
      await followup.save();

      return res.status(200).json({
        success: true,
        message: 'Lead status updated successfully',
        data: lead
      });
    } catch (error) {
      console.error('Error updating status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update lead status',
        error: error.message
      });
    }
  },

  /**
   * DELETE /api/v1/leads/delete/:id
   * POST /api/v1/leads/delete
   * Delete lead and its followups
   */
  deleteLead: async (req, res) => {
    try {
      const id = req.params.id || req.body.id || req.body._id;

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Valid Lead ID is required for deletion.'
        });
      }

      const lead = await Lead.findById(id);
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      // Check permission (only admin / hr, or user assigned to the lead can delete)
      const userRole = String(req.user?.role || req.user?.role_id || '').toLowerCase().trim();
      const userId = req.user?.id || req.user?._id;
      const isPrivileged = ['1', '2', 'hr', 'admin'].includes(userRole);
      
      if (!isPrivileged && String(lead.assignedTo) !== String(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied. You do not have permissions to delete this lead.'
        });
      }

      await Lead.findByIdAndDelete(id);
      // Delete associated followups too to keep database clean
      await LeadFollowup.deleteMany({ leadId: id });

      return res.status(200).json({
        success: true,
        message: 'Lead and its follow-up records deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting lead:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete lead',
        error: error.message
      });
    }
  },

  /**
   * POST /api/v1/leads/import
   * Bulk import leads
   */
  importLeads: async (req, res) => {
    try {
      const { leads } = req.body;

      if (!leads || !Array.isArray(leads) || leads.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No leads data found to import.'
        });
      }

      const createdById = req.user?.id || req.user?._id;

      // Map and prepare records
      const leadRecords = leads.map(item => {
        return {
          leadName: item.leadName || 'Unnamed Lead',
          phone: item.phone ? String(item.phone).replace(/^p:/i, '').trim() : '0000000000', // Strip "p:" if present from FB leads
          email: item.email || '',
          companyName: item.companyName || '',
          city: item.city || '',
          source: item.source || 'Imported Excel',
          interestedService: item.interestedService || '',
          status: item.status || 'New',
          priority: item.priority || 'Medium',
          remarks: item.remarks || 'Imported from Excel spreadsheet.',
          createdBy: createdById
        };
      });

      // Insert many
      const insertedLeads = await Lead.insertMany(leadRecords);

      // Create initial followup records for all imported leads
      const followupRecords = insertedLeads.map(lead => ({
        leadId: lead._id,
        remarks: lead.remarks || 'Lead imported from Excel.',
        statusChangedTo: lead.status,
        createdBy: createdById
      }));
      await LeadFollowup.insertMany(followupRecords);

      return res.status(201).json({
        success: true,
        message: `Successfully imported ${insertedLeads.length} leads.`,
        count: insertedLeads.length
      });
    } catch (error) {
      console.error('Error importing leads:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to import leads',
        error: error.message
      });
    }
  }
};

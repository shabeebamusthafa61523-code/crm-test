import Designation from '../models/designation.model.js';
import Department from '../modules/departments/department.model.js';

/**
 * Fetch a designation ID dynamically by matching designation name pattern.
 * @param {String|RegExp} namePattern
 * @returns {Promise<mongoose.Types.ObjectId|null>}
 */
export const getDesignationIdByName = async (namePattern) => {
  const regex = namePattern instanceof RegExp ? namePattern : new RegExp(namePattern, 'i');
  const desig = await Designation.findOne({ name: { $regex: regex } });
  return desig ? desig._id : null;
};

/**
 * Fetch all matching designation IDs dynamically.
 * @param {String|RegExp} namePattern
 * @returns {Promise<Array<mongoose.Types.ObjectId>>}
 */
export const getDesignationIdsByNamePattern = async (namePattern) => {
  const regex = namePattern instanceof RegExp ? namePattern : new RegExp(namePattern, 'i');
  const desigs = await Designation.find({ name: { $regex: regex } });
  return desigs.map(d => d._id);
};

/**
 * Fetch a department ID dynamically by matching code (priority) or name.
 * @param {String} codeOrName
 * @returns {Promise<mongoose.Types.ObjectId|null>}
 */
export const getDepartmentIdByCodeOrName = async (codeOrName) => {
  const dept = await Department.findOne({
    $or: [
      { code: String(codeOrName).toUpperCase().trim() },
      { name: { $regex: new RegExp(codeOrName, 'i') } }
    ]
  });
  return dept ? dept._id : null;
};

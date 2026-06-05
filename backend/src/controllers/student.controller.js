import StudentAttendance
from '../models/studentattendance.js';

export const markAttendance = async(req,res)=>{
  try{

    const { user_id,date,status } = req.body;

    const record =
    await StudentAttendance.findOneAndUpdate(
      { user_id,date },
      { status: status.toUpperCase() },
      {
        new:true,
        upsert:true,
        runValidators:true
      }
    );

    res.status(200).json({
      success:true,
      data:record
    });

  }catch(err){
    res.status(500).json({
      success:false,
      message:err.message
    });
  }
};

export const getAttendanceByDate = async(req,res)=>{
  try{

    const { date } = req.params;

    const records =
    await StudentAttendance.find({ date })
      .select('user_id status');

    res.status(200).json(records);

  }catch(err){
    res.status(500).json({
      success:false,
      message:err.message
    });
  }
};
import mongoose from 'mongoose';

const StudentAttendanceSchema = new mongoose.Schema({
  user_id:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'User',
    required:true
  },

  date:{
    type:String,
    required:true
  },

  status:{
    type:String,
    enum:['PRESENT','ABSENT','UNMARKED'],
    default:'UNMARKED'
  }

},{timestamps:true});

StudentAttendanceSchema.index(
  { user_id:1, date:1 },
  { unique:true }
);

export default mongoose.model(
  'StudentAttendance',
  StudentAttendanceSchema
);
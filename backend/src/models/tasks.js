import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String, 
    default: "" 
  },
  status: { 
    type: String, 
    enum: ['pending', 'current', 'preview', 'done'], 
    default: 'pending' 
  },
  assigned_to: { 
    type: String, 
    required: true // Holds the User ID string mapping to your users array
  },
  designation_id: { 
    type: String, 
    required: true // Holds the static ID index string matching frontend DESIGNATIONS
  },
  user_id: { 
    type: String, 
    required: true // Tracks the individual creator to enforce the canModify gate rule
  },
  image: { 
    type: String, 
    default: null // Secure Cloudinary asset CDN storage link string
  }
}, { timestamps: true });

// Structural UI Normalizer: Maps _id to id to keep the React dnd wrapper functional
TaskSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Create the model and export it as the default module asset
const Task = mongoose.model('Task', TaskSchema);
export default Task;
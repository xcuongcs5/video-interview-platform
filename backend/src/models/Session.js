import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
    problem:{
        type:String,
        default:""
    },
    difficulty: {
        type:String,
        enum:["easy", "medium", "hard", ""],
        default:""
    },
    customProblem: {
        type: Object,
        default: null,
    },
    isCodeTestMode: {
        type:Boolean,
        default:false
    },
    host:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    participant:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        default:null
    },
    status: {
        type:String,
        enum:["active", "completed"],
        default:"active"
    },
    callId:{
        type:String,
        default:""
    }
}, {timestamps:true});

const Session = mongoose.model("Session", sessionSchema);

export default Session;
const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
    text: String,
    completed: Boolean,
});

module.exports = mongoose.model("Task", TaskSchema);

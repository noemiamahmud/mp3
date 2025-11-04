const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Task = require('../models/task');

function parseJSON(str, defaultVal) {
    try {
        return str ? JSON.parse(str) : defaultVal;
    } catch {
        return defaultVal;
    }
}

router.get('/', async (req, res) => {
    try {
      const where = parseJSON(req.query.where, {});
      const sort = parseJSON(req.query.sort, {});
      const select = parseJSON(req.query.select, {});
      const skip = parseInt(req.query.skip) || 0;
      const limit = req.query.limit ? parseInt(req.query.limit) : 100;
      const count = req.query.count === 'true' || req.query.count === true;
  
      let query = Task.find(where).sort(sort).select(select).skip(skip).limit(limit);
  
      if (count) {
        const total = await Task.countDocuments(where);
        return res.status(200).json({ message: "OK", data: total });
      }
  
      const result = await query.exec();
      res.status(200).json({ message: "OK", data: result });
    } catch (err) {
      res.status(500).json({ message: "Server error", data: err });
    }
  });
  

router.post('/', async (req, res) => {
    try {
        const { name, description, deadline, completed, assignedUser, assignedUserName } = req.body;
        if (!name || !deadline) {
            return res.status(400).json({message: "name or deadline must be included", data: {}});
        }

        const task = new Task ({
            name,
            description: description || "",
            deadline,
            completed: completed || false,
            assignedUser: assignedUser || "",
            assignedUserName: assignedUserName || "unassigned",
            dateCreated: new Date()
        });

        const saved = await task.save();

        if (assignedUser && !task.completed) {
            await User.findByIdAndUpdate(assignedUser, {$addToSet: { pendingTasks: saved._id }});
        }

        res.status(201).json({ message: "succesfully created task", data: saved });

    } catch (err) {
        res.status(500).json({ message: "error", data: err});
    }
});



router.get('/:id', async (req, res) => {
    try {
        const select = parseJSON(req.query.select, {});
        const task = await Task.findById(req.params.id).select(select);
        if (!task)
            return res.status(404).json({message: "Cannot find Task", data: {}});
        res.status(200).json({ message: "OK", data: task });

    } catch (err) {
        res.status(500).json({ message: "error", data: err});
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { name, deadline, completed, assignedUser, assignedUserName } = req.body;
        if (!name || !deadline)
          return res.status(400).json({ message: "name and deadline must be included", data: {} });
    
        const oldTask = await Task.findById(req.params.id);
        if (!oldTask)
          return res.status(404).json({ message: "Task not found", data: {} });
    
        if (oldTask.assignedUser && oldTask.assignedUser !== assignedUser) {
          await User.findByIdAndUpdate(oldTask.assignedUser, { $pull: { pendingTasks: req.params.id } });
        }
    
        const updated = await Task.findByIdAndUpdate(
          req.params.id,
          req.body,
          { new: true, runValidators: true }
        );

        if (assignedUser && !completed) {
          await User.findByIdAndUpdate(assignedUser, { $addToSet: { pendingTasks: req.params.id } });
        }
    
        res.status(200).json({ message: "Task updated successfully", data: updated });
      } catch (err) {
        res.status(500).json({ message: "Server error", data: err });
      }
});

router.delete('/:id', async (req, res) => {

    try {
        const task = await Task.findById(req.params.id);
        if (!task)
            return restart.status(404).json({ message: "Task not found", data: {} });

            if (task.assignedUser) {
                await User.findByIdAndUpdate(task.assignedUser, { $pull: { pendingTasks: req.params.id } });
              }
          
              await task.deleteOne();
              res.status(204).json({ message: "Task deleted successfully", data: {} });
            } catch (err) {
              res.status(500).json({ message: "Server error", data: err });
            }
});

module.exports = router;


//testing
//690a59b94adb5f2c509b8b93
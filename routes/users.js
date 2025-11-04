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
    const limit = req.query.limit ? parseInt(req.query.limit) : 0;
    const count = req.query.count === 'true' || req.query.count === true;


    let query = User.find(where).sort(sort).select(select).skip(skip);
    if (limit > 0) query = query.limit(limit);

    if (count) {
        const total = await User.countDocuments(where);
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
      const { name, email } = req.body;
  
      if (!name || !email) {
        return res.status(400).json({
          message: "name or email must be included",
          data: {}
        });
      }
  
      const exists = await User.findOne({ email });
      if (exists) {
        return res.status(400).json({
          message: "change email to be unique",
          data: {}
        });
      }
  
      const newUser = new User({
        name,
        email,
        pendingTasks: [],
        dateCreated: new Date()
      });
  
      const saved = await newUser.save();
      res.status(201).json({
        message: "Successful user creation",
        data: saved
      });
  
    } catch (err) {
      console.error(err);
      if (err.code === 11000) {
        return res.status(400).json({
          message: "This email is already in use",
          data: err
        });
      }
      res.status(500).json({
        message: "error",
        data: err
      });
    }
  });
  


router.get('/:id', async (req, res) => {

    try {

        const select = parseJSON(req.query.select, {});
        const user = await User.findById(req.params.id).select(select);
        if (!user)
            return res.status(404).json({message: "Cannot find User", data: {}});
        res.status(200).json({ message: "OK", data: user });

    } catch (err) {
        res.status(400).json({ message: "ID is Invalid", data: err});
    }
});


router.put('/:id', async (req, res) => {
    try {
        const { name, email, pendingTasks } = req.body;
        if (!name || !email) {
            return res.status(400).json({ message: "name or email must be included", data: {} });

        }
        const existing = await User.findOne({ email, _id: { $ne: req.params.id } });
        if (existing)
            return res.status(400).json({ message: "email must be unique", data: {} });

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { name, email, pendingTasks },
            { new: true, runValidators: true }
    );

    if (!updatedUser)
      return res.status(404).json({ message: "User not found", data: {} });

    res.status(200).json({ message: "User updated successfully", data: updatedUser });
  } catch (err) {
    res.status(500).json({ message: "Server error", data: err });
  }
});

router.delete('/:id', async (req, res) => {

    try {
        const user = await User.findById(req.params.id);
        if (!user)
            return res.status(404).json({ message: "User not found", data: {} });

        await Task.updateMany(
            { assignedUser: req.params.id },
            { assignedUser: "", assignedUserName: "unnassigned" }
        );

        await User.deleteOne({ _id: req.params.id });
        res.status(204).json({ message: "User deleted", data: {} });

    } catch (err) {
        res.status(500).json({ message: "Server error", data: err });
    }

});

module.exports = router;



//testing
//690a54e99345372332e3b0ea
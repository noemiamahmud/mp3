const express = require('express');
const mongoose = require('mongoose');
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

function parseDeadline(deadline) {
    if (deadline === undefined || deadline === null || deadline === "") return null;
    const num = Number(deadline);
    const d = isNaN(num) ? new Date(deadline) : new Date(num);
    if (isNaN(d.getTime())) return null;
    return d;
}

function parseCompleted(val) {
    if (val === true || val === 'true' || val === '1') return true;
    if (val === false || val === 'false' || val === '0') return false;
    return false;
}

router.get('/', async (req, res) => {
    try {
        const where  = parseJSON(req.query.where, {});
        const sort   = parseJSON(req.query.sort, {});
        const select = parseJSON(req.query.select, {});
        const skip   = parseInt(req.query.skip) || 0;
        const limit  = req.query.limit ? parseInt(req.query.limit) : 100;
        const count  = req.query.count === 'true' || req.query.count === true;

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

        const deadlineDate = parseDeadline(deadline);
        if (!name || !deadlineDate) {
            return res.status(400).json({
                message: "name and valid deadline must be included",
                data: {}
            });
        }

        const completedBool = parseCompleted(completed);
        let assignedUserId = assignedUser || "";
        let assignedUserNameFinal = assignedUserName || "unassigned";


        if (assignedUserId) {
            if (!mongoose.Types.ObjectId.isValid(assignedUserId)) {
                return res.status(400).json({
                    message: "assignedUser is not a valid user id",
                    data: {}
                });
            }

            const user = await User.findById(assignedUserId);
            if (!user) {
                return res.status(400).json({
                    message: "assignedUser does not refer to an existing user",
                    data: {}
                });
            }

            assignedUserNameFinal = user.name;
        } else {
            assignedUserNameFinal = "unassigned";
        }

        const task = new Task({
            name,
            description: description || "",
            deadline: deadlineDate,
            completed: completedBool,
            assignedUser: assignedUserId,
            assignedUserName: assignedUserNameFinal,
            dateCreated: new Date()
        });

        const saved = await task.save();

        if (assignedUserId && !completedBool) {
            await User.findByIdAndUpdate(
                assignedUserId,
                { $addToSet: { pendingTasks: saved._id.toString() } }
            );
        }

        res.status(201).json({ message: "Successfully created task", data: saved });
    } catch (err) {
        res.status(500).json({ message: "error", data: err });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ message: "Task not found", data: {} });
        }

        const select = parseJSON(req.query.select, {});
        const task = await Task.findById(id).select(select);

        if (!task) {
            return res.status(404).json({ message: "Task not found", data: {} });
        }

        res.status(200).json({ message: "OK", data: task });
    } catch (err) {
        res.status(500).json({ message: "error", data: err });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ message: "Task not found", data: {} });
        }

        const { name, description, deadline, completed, assignedUser, assignedUserName } = req.body;

        const deadlineDate = parseDeadline(deadline);
        if (!name || !deadlineDate) {
            return res.status(400).json({
                message: "name and valid deadline must be included",
                data: {}
            });
        }

        const oldTask = await Task.findById(id);
        if (!oldTask) {
            return res.status(404).json({ message: "Task not found", data: {} });
        }

        const completedBool = parseCompleted(completed);
        let assignedUserId = assignedUser || "";
        let assignedUserNameFinal = assignedUserName || "unassigned";

        if (assignedUserId) {
            if (!mongoose.Types.ObjectId.isValid(assignedUserId)) {
                return res.status(400).json({
                    message: "assignedUser is not a valid user id",
                    data: {}
                });
            }

            const user = await User.findById(assignedUserId);
            if (!user) {
                return res.status(400).json({
                    message: "assignedUser does not refer to an existing user",
                    data: {}
                });
            }

            if (assignedUserName && assignedUserName !== user.name) {
                return res.status(400).json({
                    message: "assignedUserName does not match the assigned user's name",
                    data: {}
                });
            }

            assignedUserNameFinal = user.name;
        } else {
            assignedUserNameFinal = "unassigned";
        }

        if (oldTask.assignedUser) {
            const shouldRemove =
                oldTask.assignedUser !== assignedUserId || completedBool;

            if (shouldRemove) {
                await User.findByIdAndUpdate(
                    oldTask.assignedUser,
                    { $pull: { pendingTasks: id } }
                );
            }
        }

        if (assignedUserId && !completedBool) {
            await User.findByIdAndUpdate(
                assignedUserId,
                { $addToSet: { pendingTasks: id } }
            );
        }

        const updated = await Task.findByIdAndUpdate(
            id,
            {
                name,
                description: description || "",
                deadline: deadlineDate,
                completed: completedBool,
                assignedUser: assignedUserId,
                assignedUserName: assignedUserNameFinal
            },
            { new: true, runValidators: true }
        );

        res.status(200).json({ message: "Task updated successfully", data: updated });
    } catch (err) {
        res.status(500).json({ message: "Server error", data: err });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ message: "Task not found", data: {} });
        }

        const task = await Task.findById(id);
        if (!task) {
            return res.status(404).json({ message: "Task not found", data: {} });
        }

        if (task.assignedUser) {
            await User.findByIdAndUpdate(
                task.assignedUser,
                { $pull: { pendingTasks: id } }
            );
        }

        await task.deleteOne();

        res.status(204).json({ message: "Task deleted successfully", data: {} });
    } catch (err) {
        res.status(500).json({ message: "Server error", data: err });
    }
});

module.exports = router;

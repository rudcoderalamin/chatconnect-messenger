const Group = require('../models/Group');

/**
 * POST /api/groups
 * body: { name, description, photo, memberIds: [] }
 */
async function createGroup(req, res) {
  try {
    const { name, description, photo, memberIds = [] } = req.body;
    const me = req.user._id;

    if (!name) return res.status(400).json({ message: 'Group name is required' });

    const members = [
      { user: me, role: 'admin' },
      ...memberIds
        .filter((id) => id.toString() !== me.toString())
        .map((id) => ({ user: id, role: 'member' })),
    ];

    const group = await Group.create({
      name,
      description,
      photo,
      createdBy: me,
      members,
    });

    return res.status(201).json({ message: 'Group created', group });
  } catch (err) {
    console.error('[createGroup]', err);
    return res.status(500).json({ message: 'Failed to create group' });
  }
}

/**
 * PUT /api/groups/:id
 * body: { name, description, photo } - admin only
 */
async function updateGroup(req, res) {
  try {
    const { id } = req.params;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.isAdmin(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can edit the group' });
    }

    const { name, description, photo } = req.body;
    if (name !== undefined) group.name = name;
    if (description !== undefined) group.description = description;
    if (photo !== undefined) group.photo = photo;

    await group.save();
    return res.status(200).json({ message: 'Group updated', group });
  } catch (err) {
    console.error('[updateGroup]', err);
    return res.status(500).json({ message: 'Failed to update group' });
  }
}

/**
 * POST /api/groups/:id/members
 * body: { userIds: [] } - admin only
 */
async function addMembers(req, res) {
  try {
    const { id } = req.params;
    const { userIds = [] } = req.body;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.isAdmin(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can add members' });
    }

    const existingIds = group.members.map((m) => m.user.toString());
    userIds.forEach((uid) => {
      if (!existingIds.includes(uid.toString())) {
        group.members.push({ user: uid, role: 'member' });
      }
    });

    await group.save();
    return res.status(200).json({ message: 'Members added', group });
  } catch (err) {
    console.error('[addMembers]', err);
    return res.status(500).json({ message: 'Failed to add members' });
  }
}

/**
 * DELETE /api/groups/:id/members/:userId - admin only
 */
async function removeMember(req, res) {
  try {
    const { id, userId } = req.params;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.isAdmin(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can remove members' });
    }

    group.members = group.members.filter((m) => m.user.toString() !== userId);
    await group.save();
    return res.status(200).json({ message: 'Member removed', group });
  } catch (err) {
    console.error('[removeMember]', err);
    return res.status(500).json({ message: 'Failed to remove member' });
  }
}

/**
 * PUT /api/groups/:id/mute
 */
async function toggleMute(req, res) {
  try {
    const { id } = req.params;
    const me = req.user._id;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const member = group.members.find((m) => m.user.toString() === me.toString());
    if (!member) return res.status(403).json({ message: 'You are not a member of this group' });

    member.muted = !member.muted;
    await group.save();
    return res.status(200).json({ muted: member.muted });
  } catch (err) {
    console.error('[toggleMute]', err);
    return res.status(500).json({ message: 'Failed to update mute status' });
  }
}

/**
 * POST /api/groups/:id/leave
 */
async function leaveGroup(req, res) {
  try {
    const { id } = req.params;
    const me = req.user._id;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    group.members = group.members.filter((m) => m.user.toString() !== me.toString());
    await group.save();
    return res.status(200).json({ message: 'Left group' });
  } catch (err) {
    console.error('[leaveGroup]', err);
    return res.status(500).json({ message: 'Failed to leave group' });
  }
}

/**
 * DELETE /api/groups/:id - admin only
 */
async function deleteGroup(req, res) {
  try {
    const { id } = req.params;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.isAdmin(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can delete the group' });
    }

    await Group.findByIdAndDelete(id);
    return res.status(200).json({ message: 'Group deleted' });
  } catch (err) {
    console.error('[deleteGroup]', err);
    return res.status(500).json({ message: 'Failed to delete group' });
  }
}

/**
 * GET /api/groups - list groups the current user belongs to
 */
async function myGroups(req, res) {
  try {
    const groups = await Group.find({ 'members.user': req.user._id }).populate(
      'members.user',
      'name phone photo'
    );
    return res.status(200).json({ groups });
  } catch (err) {
    console.error('[myGroups]', err);
    return res.status(500).json({ message: 'Failed to fetch groups' });
  }
}

module.exports = {
  createGroup,
  updateGroup,
  addMembers,
  removeMember,
  toggleMute,
  leaveGroup,
  deleteGroup,
  myGroups,
};

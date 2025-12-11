import { Router, Request, Response } from 'express';
import { pool } from '../server';

const router = Router();

// GET /api/filter-groups - Get all filter groups
router.get('/', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, group_id as groupId, label, items_json as itemsJson,
        display_order as displayOrder,
        created_at as createdAt, updated_at as updatedAt
      FROM filter_groups
      ORDER BY display_order ASC, id ASC`
    );
    
    const groups = (rows as any[]).map(row => ({
      id: row.groupId,
      label: row.label,
      items: JSON.parse(row.itemsJson),
      displayOrder: row.displayOrder || 0,
    }));
    
    res.json(groups);
  } catch (error: any) {
    console.error('Error fetching filter groups:', error);
    res.status(500).json({ error: 'Failed to fetch filter groups', message: error.message });
  }
});

// GET /api/filter-groups/:groupId - Get single filter group
router.get('/:groupId', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    
    const [rows] = await pool.execute(
      `SELECT id, group_id as groupId, label, items_json as itemsJson,
        created_at as createdAt, updated_at as updatedAt
      FROM filter_groups
      WHERE group_id = ?`,
      [groupId]
    );
    
    const groups = rows as any[];
    if (groups.length === 0) {
      return res.status(404).json({ error: 'Filter group not found' });
    }
    
    const group = groups[0];
    res.json({
      id: group.groupId,
      label: group.label,
      items: JSON.parse(group.itemsJson),
    });
  } catch (error: any) {
    console.error('Error fetching filter group:', error);
    res.status(500).json({ error: 'Failed to fetch filter group', message: error.message });
  }
});

// POST /api/filter-groups - Create new filter group
router.post('/', async (req: Request, res: Response) => {
  try {
    const { id, label, items, displayOrder } = req.body;
    
    if (!id || !label || !items) {
      return res.status(400).json({ error: 'ID, label and items are required' });
    }
    
    const order = displayOrder !== undefined ? displayOrder : 0;
    
    const [result] = await pool.execute(
      `INSERT INTO filter_groups (group_id, label, items_json, display_order)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE label = ?, items_json = ?, display_order = ?`,
      [id, label, JSON.stringify(items), order, label, JSON.stringify(items), order]
    );
    
    const insertResult = result as any;
    res.status(201).json({ id, message: 'Filter group created/updated successfully' });
  } catch (error: any) {
    console.error('Error creating filter group:', error);
    res.status(500).json({ error: 'Failed to create filter group', message: error.message });
  }
});

// GET /api/filter-groups/config/assignments - Get filter assignments
router.get('/config/assignments', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute(
      `SELECT assignment_type as assignmentType, group_id as groupId
       FROM filter_assignments`
    );
    
    const assignments: Record<string, string> = {};
    (rows as any[]).forEach(row => {
      assignments[row.assignmentType] = row.groupId;
    });
    
    res.json(assignments);
  } catch (error: any) {
    console.error('Error fetching filter assignments:', error);
    res.status(500).json({ error: 'Failed to fetch filter assignments', message: error.message });
  }
});

// PUT /api/filter-groups/config/assignments - Update filter assignments
router.put('/config/assignments', async (req: Request, res: Response) => {
  try {
    const { assignments } = req.body;
    
    if (!assignments || typeof assignments !== 'object') {
      return res.status(400).json({ error: 'Assignments object is required' });
    }
    
    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Delete existing assignments
      await connection.query('DELETE FROM filter_assignments');
      
      // Insert new assignments
      for (const [assignmentType, groupId] of Object.entries(assignments)) {
        if (groupId) {
          await connection.query(
            'INSERT INTO filter_assignments (assignment_type, group_id) VALUES (?, ?)',
            [assignmentType, groupId]
          );
        }
      }
      
      await connection.commit();
      res.json({ message: 'Filter assignments updated successfully' });
    } catch (error: any) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Error updating filter assignments:', error);
    res.status(500).json({ error: 'Failed to update filter assignments', message: error.message });
  }
});

// PUT /api/filter-groups/config/order - Update filter group order
router.put('/config/order', async (req: Request, res: Response) => {
  try {
    const { order } = req.body;
    
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'Order array is required' });
    }
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Update display_order for each group
      for (let i = 0; i < order.length; i++) {
        await connection.query(
          'UPDATE filter_groups SET display_order = ? WHERE group_id = ?',
          [i, order[i]]
        );
      }
      
      await connection.commit();
      res.json({ message: 'Filter group order updated successfully' });
    } catch (error: any) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Error updating filter group order:', error);
    res.status(500).json({ error: 'Failed to update filter group order', message: error.message });
  }
});

// PUT /api/filter-groups/items/order - Update filter items order within a group
// Using query parameter to avoid route conflicts
router.put('/items/order', async (req: Request, res: Response) => {
  try {
    const { groupId, itemOrder, parentId } = req.body;
    
    if (!groupId) {
      return res.status(400).json({ error: 'groupId is required' });
    }
    
    console.log('[filterGroups] Reorder request received:', { 
      groupId, 
      itemOrder, 
      parentId,
      url: req.url,
      path: req.path,
      originalUrl: req.originalUrl
    });
    
    if (!Array.isArray(itemOrder)) {
      return res.status(400).json({ error: 'itemOrder array is required' });
    }
    
    // Get current group
    const [rows] = await pool.execute(
      `SELECT items_json as itemsJson FROM filter_groups WHERE group_id = ?`,
      [groupId]
    );
    
    const groups = rows as any[];
    if (groups.length === 0) {
      return res.status(404).json({ error: 'Filter group not found' });
    }
    
    const currentItems = JSON.parse(groups[0].itemsJson);
    
    if (parentId) {
      // Reorder sub-filters (children)
      const parent = currentItems[parentId];
      if (!parent) {
        return res.status(404).json({ error: 'Parent filter not found' });
      }
      
      const children = parent.children || {};
      const reorderedChildren: any = {};
      
      // Reorder children according to itemOrder
      itemOrder.forEach((childName: string) => {
        if (children[childName]) {
          reorderedChildren[childName] = children[childName];
        }
      });
      
      // Add any remaining children that weren't in the order array
      Object.keys(children).forEach(childName => {
        if (!reorderedChildren[childName]) {
          reorderedChildren[childName] = children[childName];
        }
      });
      
      currentItems[parentId] = {
        ...parent,
        children: reorderedChildren
      };
    } else {
      // Reorder main filters
      const reorderedItems: any = {};
      
      // Reorder items according to itemOrder
      itemOrder.forEach((itemName: string) => {
        if (currentItems[itemName]) {
          reorderedItems[itemName] = currentItems[itemName];
        }
      });
      
      // Add any remaining items that weren't in the order array
      Object.keys(currentItems).forEach(itemName => {
        if (!reorderedItems[itemName]) {
          reorderedItems[itemName] = currentItems[itemName];
        }
      });
      
      // Replace currentItems with reorderedItems
      Object.keys(currentItems).forEach(key => delete currentItems[key]);
      Object.keys(reorderedItems).forEach(key => {
        currentItems[key] = reorderedItems[key];
      });
    }
    
    // Update group in database
    await pool.execute(
      `UPDATE filter_groups SET items_json = ? WHERE group_id = ?`,
      [JSON.stringify(currentItems), groupId]
    );
    
    res.json({ message: 'Filter items order updated successfully' });
  } catch (error: any) {
    console.error('Error updating filter items order:', error);
    res.status(500).json({ error: 'Failed to update filter items order', message: error.message });
  }
});

// PUT /api/filter-groups/:groupId - Update filter group
router.put('/:groupId', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const { label, items, displayOrder } = req.body;
    
    const updates: string[] = [];
    const values: any[] = [];
    
    if (label !== undefined) {
      updates.push('label = ?');
      values.push(label);
    }
    if (items !== undefined) {
      updates.push('items_json = ?');
      values.push(JSON.stringify(items));
    }
    if (displayOrder !== undefined) {
      updates.push('display_order = ?');
      values.push(displayOrder);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(groupId);
    await pool.execute(
      `UPDATE filter_groups SET ${updates.join(', ')} WHERE group_id = ?`,
      values
    );
    
    res.json({ message: 'Filter group updated successfully' });
  } catch (error: any) {
    console.error('Error updating filter group:', error);
    res.status(500).json({ error: 'Failed to update filter group', message: error.message });
  }
});

// DELETE /api/filter-groups/:groupId - Delete filter group
router.delete('/:groupId', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    await pool.execute('DELETE FROM filter_groups WHERE group_id = ?', [groupId]);
    res.json({ message: 'Filter group deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting filter group:', error);
    res.status(500).json({ error: 'Failed to delete filter group', message: error.message });
  }
});

export default router;


import { Router, Request, Response } from 'express';
import { pool } from '../server';

const router = Router();

// Default sections order
const defaultSections = [
  { key: 'coinsExclusive', order: 1, enabled: true },
  { key: 'bundleDeals', order: 2, enabled: true },
  { key: 'newReleases', order: 3, enabled: true },
  { key: 'bestSellers', order: 4, enabled: true },
  { key: 'retroCorner', order: 5, enabled: true },
  { key: 'merch', order: 6, enabled: true }
];

// Helper function to check if table exists
async function tableExists(connection: any): Promise<boolean> {
  try {
    const [rows]: any = await connection.execute(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = DATABASE() AND table_name = 'home_sections_order'`
    );
    return rows[0]?.count > 0;
  } catch (error) {
    return false;
  }
}

// GET /api/home-sections - Get all sections with their order
router.get('/', async (req: Request, res: Response) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Check if table exists first
    const exists = await tableExists(connection);
    if (!exists) {
      console.warn('⚠️ home_sections_order table does not exist. Using default order.');
      console.warn('💡 Run migration: mysql -u root -p gamefrog_db < server/migrations/add_home_sections_order.sql');
      return res.json(defaultSections);
    }
    
    // Table exists, fetch data
    const [rows] = await connection.execute(
      'SELECT section_key, display_order, is_enabled FROM home_sections_order ORDER BY display_order ASC'
    );
    
    const sections = (rows as any[]).map(row => ({
      key: row.section_key,
      order: parseInt(row.display_order),
      enabled: Boolean(row.is_enabled),
    }));
    
    // If table is empty, return default order
    if (sections.length === 0) {
      return res.json(defaultSections);
    }
    
    res.json(sections);
  } catch (error: any) {
    console.error('❌ Error fetching home sections:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // If it's a table error, return default order
    if (error.code === 'ER_NO_SUCH_TABLE' || 
        error.message?.includes('doesn\'t exist') ||
        error.message?.includes('Table') && error.message?.includes('doesn\'t exist')) {
      console.warn('⚠️ Table error detected, returning default order');
      return res.json(defaultSections);
    }
    
    // For other errors, return 500 with error details
    res.status(500).json({ 
      error: 'Failed to fetch home sections', 
      message: error.message,
      code: error.code 
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// PUT /api/home-sections/order - Update sections order
router.put('/order', async (req: Request, res: Response) => {
  let connection;
  try {
    const { sections } = req.body;
    
    if (!Array.isArray(sections)) {
      return res.status(400).json({ error: 'Sections must be an array' });
    }

    connection = await pool.getConnection();
    
    // Check if table exists first
    const exists = await tableExists(connection);
    if (!exists) {
      console.warn('⚠️ home_sections_order table does not exist.');
      console.warn('💡 Run migration: mysql -u root -p gamefrog_db < server/migrations/add_home_sections_order.sql');
      return res.status(400).json({ 
        error: 'Table does not exist', 
        message: 'Please run the migration first: mysql -u root -p gamefrog_db < server/migrations/add_home_sections_order.sql' 
      });
    }
    
    // Start transaction
    await connection.beginTransaction();

    try {
      // Update each section's order
      for (const section of sections) {
        await connection.execute(
          'UPDATE home_sections_order SET display_order = ?, is_enabled = ? WHERE section_key = ?',
          [section.order, section.enabled ? 1 : 0, section.key]
        );
      }

      await connection.commit();
      res.json({ message: 'Sections order updated successfully' });
    } catch (error: any) {
      await connection.rollback();
      throw error;
    }
  } catch (error: any) {
    console.error('❌ Error updating home sections order:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // If it's a table error, return specific message
    if (error.code === 'ER_NO_SUCH_TABLE' || error.message?.includes('doesn\'t exist')) {
      return res.status(400).json({ 
        error: 'Table does not exist', 
        message: 'Please run the migration first: mysql -u root -p gamefrog_db < server/migrations/add_home_sections_order.sql' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to update sections order', 
      message: error.message,
      code: error.code 
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

export default router;


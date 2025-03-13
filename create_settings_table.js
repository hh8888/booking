const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xtayfsvrpbhrrcveebtn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0YXlmc3ZycGJocnJjdmVlYnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3MjgxMzgsImV4cCI6MjA1NjMwNDEzOH0.xRz1h-Q8WnoOkMdNob26NeUWaL7j4ZXeLjRG88myGAQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createSettingsTable() {
  try {
    // Try to create a record directly, if the table doesn't exist, it will return a specific error
    const { data: testData, error: testError } = await supabase
      .from('settings')
      .insert([
        { 
          category: 'system', 
          key: 'version', 
          value: '1.0.0' 
        }
      ])
      .select();

    if (testError) {
      if (testError.code === '42P01') {
        console.log('Settings table does not exist, need to create table structure');
        
        // Since we cannot execute SQL to create tables directly, we need to contact Supabase admin
        // or use Supabase Dashboard to create the table
        console.error('Please create settings table in Supabase Dashboard with the following structure:');
        console.error(`
          CREATE TABLE IF NOT EXISTS settings (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            category VARCHAR(50) NOT NULL,
            key VARCHAR(100) NOT NULL,
            value TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(category, key)
          );
          
          CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);
          CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
          
          COMMENT ON TABLE settings IS 'Table for storing application configuration and settings';
        `);
      } else {
        console.error('Error creating settings record:', testError);
      }
    } else {
      console.log('Settings table exists and successfully inserted a record:', testData);
    }
  } catch (err) {
    console.error('Error executing operation:', err);
  }
}

createSettingsTable();
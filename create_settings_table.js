const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xtayfsvrpbhrrcveebtn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0YXlmc3ZycGJocnJjdmVlYnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3MjgxMzgsImV4cCI6MjA1NjMwNDEzOH0.xRz1h-Q8WnoOkMdNob26NeUWaL7j4ZXeLjRG88myGAQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createSettingsTable() {
  try {
    // 直接尝试创建一条记录，如果表不存在，会返回特定错误
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
        console.log('Settings表不存在，需要创建表结构');
        
        // 由于无法直接执行SQL创建表，我们需要联系Supabase管理员
        // 或者使用Supabase Dashboard创建表
        console.error('请在Supabase Dashboard中创建settings表，表结构如下：');
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
        console.error('尝试创建settings记录时出错:', testError);
      }
    } else {
      console.log('Settings表已存在，并成功插入了一条记录:', testData);
    }
  } catch (err) {
    console.error('执行操作时出错:', err);
  }
}

createSettingsTable();
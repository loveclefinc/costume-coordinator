-- Supabase Schema for Costume Coordinator
-- このSQLをSupabase SQLエディタで実行してください

-- ユーザープロフィールテーブル
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- イベントテーブル
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  location TEXT,
  event_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 衣装テーブル（拡張版：スーツ、ネクタイ、蝶ネクタイ、ワイシャツ対応）
CREATE TABLE IF NOT EXISTS costumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('suit', 'necktie', 'bow_tie', 'dress_shirt')),
  name TEXT NOT NULL,
  image_url TEXT,
  photo_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- 共通属性
  color TEXT,
  pattern TEXT,
  material TEXT,
  
  -- スーツ属性
  suit_tone TEXT,
  suit_fit TEXT CHECK (suit_fit IN ('slim', 'regular', 'relaxed')),
  suit_season TEXT CHECK (suit_season IN ('spring', 'summer', 'fall', 'winter', 'all')),
  
  -- ネクタイ属性
  necktie_width TEXT CHECK (necktie_width IN ('narrow', 'standard', 'wide')),
  necktie_length TEXT CHECK (necktie_length IN ('short', 'standard', 'long')),
  necktie_texture TEXT CHECK (necktie_texture IN ('smooth', 'textured', 'knit')),
  
  -- 蝶ネクタイ属性
  bow_tie_style TEXT CHECK (bow_tie_style IN ('classic', 'modern', 'oversized')),
  bow_tie_adjustable BOOLEAN DEFAULT FALSE,
  bow_tie_texture TEXT CHECK (bow_tie_texture IN ('smooth', 'textured', 'knit')),
  
  -- ワイシャツ属性
  shirt_collar TEXT CHECK (shirt_collar IN ('spread', 'point', 'club', 'wing')),
  shirt_sleeve TEXT CHECK (shirt_sleeve IN ('short', 'long', 'three_quarter')),
  shirt_fit TEXT CHECK (shirt_fit IN ('slim', 'regular', 'relaxed')),
  shirt_texture TEXT CHECK (shirt_texture IN ('smooth', 'textured', 'oxford')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 参加者テーブル
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  instrument TEXT,
  photo_url TEXT,
  selected_costume_id UUID REFERENCES costumes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 衣装使用履歴テーブル
CREATE TABLE IF NOT EXISTS costume_usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  costume_id UUID NOT NULL REFERENCES costumes(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  used_date DATE NOT NULL,
  coordinate_with JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 最適化結果テーブル
CREATE TABLE IF NOT EXISTS optimization_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  recommended_costume_id UUID REFERENCES costumes(id) ON DELETE SET NULL,
  recommended_necktie_id UUID REFERENCES costumes(id) ON DELETE SET NULL,
  recommended_bow_tie_id UUID REFERENCES costumes(id) ON DELETE SET NULL,
  recommended_shirt_id UUID REFERENCES costumes(id) ON DELETE SET NULL,
  compatibility_score DECIMAL(3,2),
  color_harmony DECIMAL(3,2),
  pattern_balance DECIMAL(3,2),
  material_balance DECIMAL(3,2),
  season_match DECIMAL(3,2),
  recommendations TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- オフライン同期キューテーブル
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  data JSONB,
  synced BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP WITH TIME ZONE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_costumes_user_id ON costumes(user_id);
CREATE INDEX IF NOT EXISTS idx_costumes_item_type ON costumes(item_type);
CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_costume_usage_user_id ON costume_usage_history(user_id);
CREATE INDEX IF NOT EXISTS idx_costume_usage_costume_id ON costume_usage_history(costume_id);
CREATE INDEX IF NOT EXISTS idx_optimization_event_id ON optimization_results(event_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_user_id ON sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced);

-- RLS（Row Level Security）ポリシー設定
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE costumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE costume_usage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- user_profiles RLS
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- events RLS
CREATE POLICY "Users can view their own events" ON events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create events" ON events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events" ON events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events" ON events
  FOR DELETE USING (auth.uid() = user_id);

-- costumes RLS
CREATE POLICY "Users can view their own costumes" ON costumes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create costumes" ON costumes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own costumes" ON costumes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own costumes" ON costumes
  FOR DELETE USING (auth.uid() = user_id);

-- participants RLS
CREATE POLICY "Users can view participants in their events" ON participants
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM events WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create participants in their events" ON participants
  FOR INSERT WITH CHECK (
    event_id IN (
      SELECT id FROM events WHERE user_id = auth.uid()
    ) AND user_id = auth.uid()
  );

CREATE POLICY "Users can update participants in their events" ON participants
  FOR UPDATE USING (
    event_id IN (
      SELECT id FROM events WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete participants in their events" ON participants
  FOR DELETE USING (
    event_id IN (
      SELECT id FROM events WHERE user_id = auth.uid()
    )
  );

-- costume_usage_history RLS
CREATE POLICY "Users can view their own usage history" ON costume_usage_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create usage history" ON costume_usage_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- optimization_results RLS
CREATE POLICY "Users can view their own optimization results" ON optimization_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create optimization results" ON optimization_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own optimization results" ON optimization_results
  FOR UPDATE USING (auth.uid() = user_id);

-- sync_queue RLS
CREATE POLICY "Users can view their own sync queue" ON sync_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create sync queue items" ON sync_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync queue items" ON sync_queue
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sync queue items" ON sync_queue
  FOR DELETE USING (auth.uid() = user_id);

-- リアルタイム同期設定
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE costumes;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE costume_usage_history;
ALTER PUBLICATION supabase_realtime ADD TABLE optimization_results;

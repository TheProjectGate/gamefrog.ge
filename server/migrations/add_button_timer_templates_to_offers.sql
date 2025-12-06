ALTER TABLE limited_time_offers
    ADD COLUMN IF NOT EXISTS button_template VARCHAR(50) DEFAULT 'default' COMMENT 'Button template style',
    ADD COLUMN IF NOT EXISTS button_bg_color VARCHAR(7) DEFAULT '#FF3131' COMMENT 'Button background color',
    ADD COLUMN IF NOT EXISTS button_border_color VARCHAR(7) DEFAULT '#000000' COMMENT 'Button border color',
    ADD COLUMN IF NOT EXISTS timer_template VARCHAR(50) DEFAULT 'default' COMMENT 'Timer template style',
    ADD COLUMN IF NOT EXISTS timer_bg_color VARCHAR(7) DEFAULT '#1F1F1F' COMMENT 'Timer background color',
    ADD COLUMN IF NOT EXISTS timer_text_color VARCHAR(7) DEFAULT '#FFD700' COMMENT 'Timer text color',
    ADD COLUMN IF NOT EXISTS timer_border_color VARCHAR(7) DEFAULT '#000000' COMMENT 'Timer border color';


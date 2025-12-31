-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Verify extensions
SELECT extname, extversion FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'postgis', 'pg_trgm');

-- Add generated column for geom in locations table
-- This is done after the table is created by Prisma
-- Run this manually after first migration

ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS geom geography(Point, 4326) 
GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED;

-- Create GIST index for geospatial queries
CREATE INDEX IF NOT EXISTS idx_locations_geom_gist ON locations USING GIST (geom);

-- Function to safely apply wallet transactions
CREATE OR REPLACE FUNCTION apply_wallet_transaction(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason VARCHAR,
    p_reference_type VARCHAR DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_wallet_id UUID;
    v_new_balance INTEGER;
    v_transaction_id UUID;
BEGIN
    -- Get or create wallet
    SELECT id INTO v_wallet_id FROM wallets WHERE user_id = p_user_id;
    IF v_wallet_id IS NULL THEN
        INSERT INTO wallets (user_id, balance) 
        VALUES (p_user_id, 0) 
        RETURNING id INTO v_wallet_id;
    END IF;

    -- Calculate new balance
    SELECT balance + p_amount INTO v_new_balance FROM wallets WHERE id = v_wallet_id;
    
    -- Prevent negative balance
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Insert transaction
    INSERT INTO wallet_transactions (
        wallet_id, amount, reason, 
        reference_type, reference_id, balance_after
    ) VALUES (
        v_wallet_id, p_amount, p_reason,
        p_reference_type, p_reference_id, v_new_balance
    )
    RETURNING id INTO v_transaction_id;

    -- Update cached balance
    UPDATE wallets SET balance = v_new_balance, updated_at = NOW()
    WHERE id = v_wallet_id;

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

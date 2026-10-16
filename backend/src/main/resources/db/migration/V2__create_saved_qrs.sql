CREATE TABLE saved_qrs (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    title VARCHAR(80) NOT NULL,
    encrypted_payload BYTEA NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX saved_qrs_owner_order_idx ON saved_qrs (owner_id, created_at DESC, id DESC);
CREATE INDEX saved_qrs_owner_type_order_idx ON saved_qrs (owner_id, type, created_at DESC, id DESC);

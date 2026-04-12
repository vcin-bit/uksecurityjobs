const { createClient } = require('@supabase/supabase-js');

// Supabase admin client — bypasses RLS for server-side operations
// RLS is enforced manually by setting app.current_user_id
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Set the current user context for RLS policies
async function setUserContext(userId) {
  await supabase.rpc('set_config', {
    setting: 'app.current_user_id',
    value: userId
  });
}

// Encrypt a sensitive value using pgcrypto
async function encrypt(value) {
  if (!value) return null;
  const { data, error } = await supabase.rpc('encrypt_value', {
    val: value,
    key: process.env.ENCRYPTION_KEY
  });
  if (error) throw new Error('Encryption failed: ' + error.message);
  return data;
}

// Decrypt a sensitive value using pgcrypto
async function decrypt(encrypted) {
  if (!encrypted) return null;
  const { data, error } = await supabase.rpc('decrypt_value', {
    encrypted_val: encrypted,
    key: process.env.ENCRYPTION_KEY
  });
  if (error) throw new Error('Decryption failed: ' + error.message);
  return data;
}

// Write to audit log
async function auditLog({ tableName, recordId, action, performedBy, ipAddress, changes }) {
  await supabase.from('audit_log').insert({
    table_name: tableName,
    record_id: recordId,
    action,
    performed_by: performedBy,
    ip_address: ipAddress,
    changes
  });
}

module.exports = { supabase, setUserContext, encrypt, decrypt, auditLog };

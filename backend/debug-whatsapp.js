const Database = require('better-sqlite3')
const db = new Database('./database.sqlite')

console.log('=== ANÁLISE DOS NÚMEROS DE TELEFONE ===')
const messages = db
  .prepare(
    'SELECT id, phone_number, message, created_at, type FROM whatsapp_messages ORDER BY created_at DESC LIMIT 30'
  )
  .all()

messages.forEach((msg) => {
  console.log(
    `ID: ${msg.id} | Phone: ${msg.phone_number} | Type: ${
      msg.type
    } | Message: ${msg.message.substring(0, 50)}...`
  )
})

console.log('\n=== CONTAGEM POR NÚMERO ===')
const counts = db
  .prepare(
    'SELECT phone_number, COUNT(*) as count FROM whatsapp_messages GROUP BY phone_number ORDER BY count DESC'
  )
  .all()
counts.forEach((c) => {
  console.log(`${c.phone_number}: ${c.count} mensagens`)
})

console.log('\n=== NÚMEROS QUE COMEÇAM COM 55 ===')
const with55 = db
  .prepare(
    'SELECT DISTINCT phone_number FROM whatsapp_messages WHERE phone_number LIKE "55%"'
  )
  .all()
with55.forEach((p) => console.log(p.phone_number))

console.log('\n=== NÚMEROS QUE NÃO COMEÇAM COM 55 ===')
const without55 = db
  .prepare(
    'SELECT DISTINCT phone_number FROM whatsapp_messages WHERE phone_number NOT LIKE "55%"'
  )
  .all()
without55.forEach((p) => console.log(p.phone_number))

db.close()

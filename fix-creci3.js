import { createClient } from '@libsql/client';

const client = createClient({
  url: 'libsql://iamobil-edyinvesti.aws-us-west-2.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzc0OTg4NzUsImlkIjoiMDE5ZGRiMmUtNjUwMS03ZjViLWFiYTktZmM5NTkzZDAwY2NhIiwicmlkIjoiYzk2ZTRkZmEtOTExYi00YmFkLWEwYjMtYzY3Nzc3OTk1MDdkIn0.aKiA5aXmvfBKMpATrm34_c7IvkMK64XI1LHUtsMseYBej_0SzZb_VEMZSfujb72xCzerPZA3vdizhxzABLALAQ'
});

const userCreci = '987456-F';

const remaining = [
  'b6cc813e-7cb7-4ce9-9b6c-153ba56b0c4b',
  '5da6c6a8-7349-4305-b145-8b417ecb5aab',
  '634b00ae-a311-43ee-8e17-c95611de278f',
  'prop_1778454983337',
  'bc9c0371-b46f-461c-88c0-bd58ae6d30d4',
  'cd97e9e1-bb0d-4600-82cb-5c077e7f6d6b',
  'prop_seed_1778201309926',
  'prop_1778454984793',
  'prop_1778454988009',
  'prop_1778454986511'
];

for (const id of remaining) {
  await client.execute({
    sql: "UPDATE properties SET broker_creci = ? WHERE id = ?",
    args: [userCreci, id]
  });
  console.log('Updated:', id);
}

const verify = await client.execute({ sql: "SELECT COUNT(*) as total, COUNT(broker_creci) as with_creci FROM properties", args: [] });
console.log('\nFinal result:', verify.rows[0]);
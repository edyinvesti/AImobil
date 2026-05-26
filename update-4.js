import { createClient } from '@libsql/client';
const client = createClient({
  url: 'libsql://iamobil-edyinvesti.aws-us-west-2.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzc0OTg4NzUsImlkIjoiMDE5ZGRiMmUtNjUwMS03ZjViLWFiYTktZmM5NTkzZDAwY2NhIiwicmlkIjoiYzk2ZTRkZmEtOTExYi00YmFkLWEwYjMtYzY3Nzc3OTk1MDdkIn0.aKiA5aXmvfBKMpATrm34_c7IvkMK64XI1LHUtsMseYBej_0SzZb_VEMZSfujb72xCzerPZA3vdizhxzABLALAQ'
});
await client.execute({ sql: "UPDATE properties SET broker_creci = ? WHERE id = ?", args: ['987456-F', 'cd97e9e1-bb0d-4600-82cb-5c077e7f6d6b'] });
console.log('3');
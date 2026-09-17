import test from 'node:test';
import assert from 'node:assert/strict';
import { healthFileInput, extractHealthFile, maximumHealthFileBytes } from '../src/lib/health/documentFileExtraction';
const pdf = new TextEncoder().encode('%PDF-1.7\nTest synthetic document');
test('file processing permits verified PDF/image types and rejects empty, disguised and oversized uploads', () => {
  assert.equal(healthFileInput(pdf,'application/pdf').type,'input_file');
  assert.throws(()=>healthFileInput(pdf,'image/png'));
  assert.throws(()=>healthFileInput(new Uint8Array(),'application/pdf'));
  assert.throws(()=>healthFileInput(new Uint8Array(maximumHealthFileBytes+1),'application/pdf'));
  assert.throws(()=>healthFileInput(new TextEncoder().encode('<html>bad</html>'),'application/pdf'));
});
test('file extraction validates completed source-backed proposals and never calls external tools', async () => {
  const originalFetch=global.fetch;
  const originalKey=process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY='sk-test-health-file';
  let status='completed'; let source='Medication: Example (historical)';
  global.fetch=async (_input,init) => {
    const body=JSON.parse(String(init?.body));
    assert.equal(body.store,false); assert.equal(body.tools,undefined);
    assert.match(body.instructions,/untrusted/);
    assert.equal(body.input[0].content[1].filename,'health-document.pdf');
    return new Response(JSON.stringify({status,output:[{content:[{type:'output_text',text:JSON.stringify({summary:'One historical medication.',items:[{category:'medication',label:'Example',value:'Historical; current use unknown.',occurred_on:null,source_excerpt:source,confidence:0.8}]})}]}]}),{status:200});
  };
  try {
    const result=await extractHealthFile(pdf,'application/pdf');
    assert.equal(result.items[0].value,'Historical; current use unknown.');
    status='incomplete'; await assert.rejects(extractHealthFile(pdf,'application/pdf'),/did not finish/);
    status='completed'; source=''; await assert.rejects(extractHealthFile(pdf,'application/pdf'),/validated/);
  } finally {global.fetch=originalFetch; if(originalKey===undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=originalKey;}
});

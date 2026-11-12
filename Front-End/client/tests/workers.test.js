import test from 'node:test'
import assert from 'node:assert/strict'
import { workerClient } from '../src/app/workers/client.js'

function fakeWorker() {
  return { messages: [], postMessage(message) { this.messages.push(message) }, terminate() { this.terminated = true } }
}
test('worker replies resolve the matching request even out of order', async () => {
  const worker = fakeWorker(), client = workerClient(worker)
  const first = client.request('first'), second = client.request('second')
  worker.onmessage({ data: { id: 2, result: 'second' } })
  worker.onmessage({ data: { id: 1, result: 'first' } })
  assert.deepEqual(await Promise.all([first, second]), ['first', 'second'])
  client.close()
})
test('closing cancels pending inference and rejects new work', async () => {
  const worker = fakeWorker(), client = workerClient(worker)
  const pending = assert.rejects(client.request('detect'), /цуцлагдлаа/)
  client.close(); await pending
  assert.equal(worker.terminated, true)
  await assert.rejects(client.request('detect'), /хаагдсан/)
})
test('worker timeout terminates the worker and settles every outstanding task', async () => {
  const worker = fakeWorker(), client = workerClient(worker)
  const pending = [client.request('slow', null, [], 5), client.request('queued')].map(promise => assert.rejects(promise, /хугацаа дууслаа/))
  await Promise.all(pending)
  assert.equal(worker.terminated, true)
})

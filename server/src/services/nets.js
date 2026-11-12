  // Owner: Declan – helpers that call the NETS QR Web API.
  // Keep API keys in server/.env (NETS_API_KEY, NETS_PROJECT_ID), never in code.

// NETS QR sandbox calls (copied from the coursework config + layout).
const BASE = 'https://sandbox.nets.openapipaas.com/api/v1/common/payments';

const authHeaders = () => ({
  'api-key': process.env.NETS_API_KEY,
  'project-id': process.env.NETS_PROJECT_ID,
});

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    console.error('NETS error', path, res.status, json);
    throw new Error(`NETS request failed (${res.status})`);
  }
  const data = json?.result?.data;
  if (!data) throw new Error('Unexpected NETS response');
  return data;
}

// -> { response_code, txn_status, qr_code, txn_retrieval_ref, network_status, instruction }
function requestQr(amountDollars) {
  return post('/nets-qr/request', {
    txn_id: process.env.NETS_TXN_ID,
    amt_in_dollars: amountDollars,
    notify_mobile: 0,
  });
}

// -> { response_code, txn_status, ... }   paid when response_code === '00' && txn_status === 1
function queryQr(ref, timedOut) {
  return post('/nets-qr/query', {
    txn_retrieval_ref: ref,
    frontend_timeout_status: timedOut ? 1 : 0,
  });
}

// Listens to NETS's server-sent-events stream (what EventSourcePolyfill did in the coursework).
// onMessage gets the parsed JSON, e.g. { message: 'QR code scanned', response_code: '00' }.
function listenForScan(ref, { onMessage, onEnd }) {
  const controller = new AbortController();
  let url = `${BASE}/nets/webhook?txn_retrieval_ref=${encodeURIComponent(ref)}`;
  if (process.env.NETS_COURSE_INIT_ID) url += `&course_init_id=${process.env.NETS_COURSE_INIT_ID}`;

  (async () => {
    try {
      const res = await fetch(url, {
        headers: { ...authHeaders(), Accept: 'text/event-stream' },
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`NETS webhook failed (${res.status})`);

      const decoder = new TextDecoder();
      let buffer = '';
      for await (const chunk of res.body) {
        buffer += decoder.decode(chunk, { stream: true });
        let m;
        while ((m = buffer.match(/\r?\n\r?\n/))) {
          const block = buffer.slice(0, m.index);
          buffer = buffer.slice(m.index + m[0].length);
          const data = block
            .split(/\r?\n/)
            .filter((l) => l.startsWith('data:'))
            .map((l) => l.slice(5).trim())
            .join('\n');
          if (!data) continue;
          try { onMessage(JSON.parse(data)); } catch (err) { console.error('NETS message', err); }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') console.error('NETS stream', err.message);
    } finally {
      onEnd?.();
    }
  })();

  return { close: () => controller.abort() };
}

module.exports = { requestQr, queryQr, listenForScan };
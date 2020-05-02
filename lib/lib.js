export function fetcher(query, callback, variables){
    fetch('/api', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    body: JSON.stringify({
        query,
        variables,
      })
    })
    .then(r => r.json())
    .then(data => callback(data));
}

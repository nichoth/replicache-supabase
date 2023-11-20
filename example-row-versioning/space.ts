export async function initSpace (serverURL, setRoute) {
    const { pathname } = window.location
    const paths = pathname.split('/')
    const [, spaceDir, spaceID] = paths

    if (spaceDir === 'space' && spaceID) {
        if (await spaceExists(serverURL, spaceID)) {
            return spaceID
        }
    }

    const newSpaceID = await createSpace(serverURL)
    setRoute(`/space/${newSpaceID}`)
    return newSpaceID
}

async function spaceExists (serverURL, spaceID) {
    const res = await fetchJSON(serverURL, 'spaceExists', spaceID)
    return res.spaceExists
}

async function createSpace (serverURL) {
    const createSpaceRes = await fetchJSON(serverURL, 'createSpace')
    return createSpaceRes.spaceID
}

async function fetchJSON (serverURL, apiName, spaceID?) {
    /**
     * @TODO -- change URL and implement this
     */
    const res = await fetch(`${serverURL}/api/replicache/${apiName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: (spaceID ? JSON.stringify({ spaceID }) : null)
    })
    return await res.json()
}

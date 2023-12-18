// jenkinsApi.js
const axios = require('axios');
const authHeader = 'Basic '; // Replace with your encoded credentials

async function getJenkinsJobData(pipelineUrl) {
    try {
        const response = await axios.get(`${pipelineUrl}/api/json?pretty=true`, {
            headers: { Authorization: authHeader }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching data from Jenkins:', error);
        throw error;
    }
}

async function getBuildData(buildUrl) {
    try {
        const response = await axios.get(`${buildUrl}/api/json?pretty=true`, {
            headers: { Authorization: authHeader }
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching build data from ${buildUrl}:`, error);
        throw error;
    }
}

async function processJobData(builds) {
    let successCount = 0;
    let failCount = 0;
    console.log(builds)
    if (!Array.isArray(builds)) {
        console.error('Invalid input: builds is not an array');
        return { successCount, failCount };
    }

    for (const build of builds) {
        try {
            const buildData = await getBuildData(build.url.replace("localhost:8080","127.0.0.1:8080"));
            if (buildData.result === 'SUCCESS') {
                successCount++;
            } else if (buildData.result === 'FAILURE') {
                failCount++;
            }
        } catch (error) {
            console.error(`Error fetching build data from ${build.url}:`, error);
        }
    }
    console.log(successCount)
    console.log(failCount)
    return { successCount, failCount };
}

module.exports = { getJenkinsJobData, processJobData };

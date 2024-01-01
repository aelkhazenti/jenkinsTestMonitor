// jenkinsApi.js
const axios = require('axios');
const authHeader = 'Basic YXltYW5lOjExOTdhZTY5YTA0ZTcyNjJhMjZmYjg5MDZjODY3ODZiNTg='; // Replace with your encoded credentials

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
    let userActivity = {}; // New object to track user activity
    let dailyActivity = {};
    let jobDurations = [];


    if (!Array.isArray(builds)) {
        console.error('Invalid input: builds is not an array');
        return { successCount, failCount, userActivity };
    }

    for (const build of builds) {
        try {
            const buildData = await getBuildData(build.url.replace("localhost:8080","127.0.0.1:8080"));
            if (buildData.result === 'SUCCESS') {
                successCount++;
            } else if (buildData.result === 'FAILURE') {
                failCount++;
            }

            const userAction = buildData.actions.find(action => action._class === "hudson.model.CauseAction");
            if (userAction && userAction.causes && userAction.causes.length > 0) {
                const userName = userAction.causes[0].userName;
                userActivity[userName] = (userActivity[userName] || 0) + 1;
            }

            const date = new Date(buildData.timestamp);
            const day = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
            dailyActivity[day] = (dailyActivity[day] || 0) + 1;

            jobDurations.push({ jobName: buildData.fullDisplayName, duration: buildData.duration });


        } catch (error) {
            console.error(`Error fetching build data from ${build.url}:`, error);
        }
    }
    console.log(successCount)
    console.log(failCount)
    return { successCount, failCount, userActivity, dailyActivity, jobDurations };
}

module.exports = { getJenkinsJobData, processJobData };

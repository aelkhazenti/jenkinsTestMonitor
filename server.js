const express = require('express');
const { getJenkinsJobData, processJobData } = require('./jenkinsApi');

const app = express();

const pipelineUrls = [
    'http://127.0.0.1:8080/job/test1',
    'http://127.0.0.1:8080/job/test2',
];

// Function to generate a distinct color for each user
function generateColor(index) {
    const hue = index * 137.508; // use golden angle approximation
    return `hsl(${hue}, 50%, 60%)`;
}

app.get('/', async (req, res) => {
    try {
        let allPipelineData = [];

        for (const url of pipelineUrls) {
            const jobs = await getJenkinsJobData(url);
            const jobName = jobs.fullName;

            if (jobs && jobs.builds.length > 0) {
                const { successCount, failCount, userActivity } = await processJobData(jobs.builds);
                allPipelineData.push({ url, successCount, failCount, jobName, userActivity });
            } else {
                allPipelineData.push({ url, successCount: 0, failCount: 0, jobName, userActivity: {} });
            }
        }

        let canvasElements = '';
        let chartScripts = '';

        allPipelineData.forEach((pipeline, pipelineIndex) => {
            // Generate build status chart
            canvasElements += `<div class="chart">
                                   <h3>${pipeline.jobName} - Build Status</h3>
                                   <canvas id="buildChart${pipelineIndex}"></canvas>
                               </div>`;
            chartScripts += `const ctx${pipelineIndex} = document.getElementById('buildChart${pipelineIndex}').getContext('2d');
                             new Chart(ctx${pipelineIndex}, {
                                 type: 'bar',
                                 data: {
                                     labels: ['Successful', 'Failed'],
                                     datasets: [{
                                         label: 'Builds',
                                         data: [${pipeline.successCount}, ${pipeline.failCount}],
                                         backgroundColor: ['rgba(75, 192, 192, 0.2)', 'rgba(255, 99, 132, 0.2)'],
                                         borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
                                         borderWidth: 1
                                     }]
                                 },
                                 options: {
                                     scales: {
                                         y: {
                                             beginAtZero: true
                                         }
                                     }
                                 }
                             });`;

            // Generate user activity chart
            const userNames = Object.keys(pipeline.userActivity);
            const userRequestCounts = Object.values(pipeline.userActivity);
            const backgroundColors = userNames.map((_, index) => generateColor(index));

            canvasElements += `<div class="chart">
                                   <h3>${pipeline.jobName} - User Activity</h3>
                                   <canvas id="userActivityChart${pipelineIndex}"></canvas>
                               </div>`;
            chartScripts += `const userCtx${pipelineIndex} = document.getElementById('userActivityChart${pipelineIndex}').getContext('2d');
                             new Chart(userCtx${pipelineIndex}, {
                                 type: 'bar',
                                 data: {
                                     labels: ${JSON.stringify(userNames)},
                                     datasets: [{
                                         label: 'Number of Requests',
                                         data: ${JSON.stringify(userRequestCounts)},
                                         backgroundColor: ${JSON.stringify(backgroundColors)},
                                         borderColor: ${JSON.stringify(backgroundColors)},
                                         borderWidth: 1
                                     }]
                                 },
                                 options: {
                                     scales: {
                                         y: {
                                             beginAtZero: true
                                         }
                                     }
                                 }
                             });`;
        });

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <style>
                    .chart-container {
                        display: flex;
                        flex-wrap: wrap;
                        justify-content: space-around;
                    }
                    .chart {
                        flex: 1;
                        min-width: 600px;
                        max-width: 750px;
                        margin: 10px;
                    }
                </style>
                <title>Jenkins Job Status</title>
                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            </head>
            <body>
                <h1>Jenkins Build Analysis</h1>
                <div class="chart-container">
                    ${canvasElements}
                </div>
                <script>
                    ${chartScripts}
                </script>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).send('Error processing Jenkins data');
    }
});

module.exports = app;

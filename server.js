// server.js
const express = require('express');
const { getJenkinsJobData, processJobData } = require('./jenkinsApi');

const app = express();

const pipelineUrls = [
    'http://127.0.0.1:8080/job/test1',
    'http://127.0.0.1:8080/job/test2',
    'http://127.0.0.1:8080/job/test1',
    'http://127.0.0.1:8080/job/test1',
    'http://127.0.0.1:8080/job/test2','http://127.0.0.1:8080/job/test1',
    'http://127.0.0.1:8080/job/test2',
];

app.get('/', async (req, res) => {
    try {
        let allPipelineData = [];

        for (const url of pipelineUrls) {
            const jobs = await getJenkinsJobData(url);
            const jobName = jobs.fullName;
            if (jobs && jobs.builds.length > 0) {
                const { successCount, failCount } = await processJobData(jobs.builds);
                allPipelineData.push({ url, successCount, failCount, jobName });
            } else {
                allPipelineData.push({ url, successCount: 0, failCount: 0, jobName });
            }
        }
        // Generate canvas elements and script tags for each pipeline
        let canvasElements = '';
        let chartScripts = '';

        allPipelineData.forEach((pipeline, index) => {
            canvasElements += `<div class="chart">
                                    <canvas id="buildChart${index}"></canvas>
                                </div>`;

            chartScripts += `const ctx${index} = document.getElementById('buildChart${index}').getContext('2d');
                             const buildChart${index} = new Chart(ctx${index}, {
                                 type: 'bar',
                                 data: {
                                     labels: ['Builds for ${pipeline.jobName}'],
                                     datasets: [{
                                         label: 'Successful Builds',
                                         data: [${pipeline.successCount}],
                                         backgroundColor: 'rgba(75, 192, 192, 0.2)',
                                         borderColor: 'rgba(75, 192, 192, 1)',
                                         borderWidth: 1
                                     }, {
                                         label: 'Failed Builds',
                                         data: [${pipeline.failCount}],
                                         backgroundColor: 'rgba(255, 99, 132, 0.2)',
                                         borderColor: 'rgba(255, 99, 132, 1)',
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
                        min-width: 600px; /* Minimum width for each chart */
                        max-width: 750px;
                        margin: 10px;
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


        // Render the response with HTML and Chart.js
        // You'll need to write the logic to generate a chart for each pipeline.
        // res.send(`
        //             <!DOCTYPE html>
        //             <html lang="en">
        //             <head>
        //                 <meta charset="UTF-8">
        //                 <title>Jenkins Job Status</title>
        //                 <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        //             </head>
        //             <body>
        //                 <h1>Jenkins Build Analysis</h1>
        //                 <div style="width: 600px; height: 400px;">
        //                     <canvas id="buildChart"></canvas>
        //                 </div>
        //                 <script>
        //                     const ctx = document.getElementById('buildChart').getContext('2d');
        //                     const buildChart = new Chart(ctx, {
        //                         type: 'bar',
        //                         data: {
        //                             labels: ['Builds'],
        //                             datasets: [{
        //                                 label: 'Successful Builds',
        //                                 data: [${successCount}],
        //                                 backgroundColor: 'rgba(75, 192, 192, 0.2)',
        //                                 borderColor: 'rgba(75, 192, 192, 1)',
        //                                 borderWidth: 1
        //                             }, {
        //                                 label: 'Failed Builds',
        //                                 data: [${failCount}],
        //                                 backgroundColor: 'rgba(255, 99, 132, 0.2)',
        //                                 borderColor: 'rgba(255, 99, 132, 1)',
        //                                 borderWidth: 1
        //                             }]
        //                         },
        //                         options: {
        //                             scales: {
        //                                 y: {
        //                                     beginAtZero: true
        //                                 }
        //                             }
        //                         }
        //                     });
        //                 </script>
        //             </body>
        //             </html>
        //         `);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).send('Error processing Jenkins data');
    }
});

module.exports = app;

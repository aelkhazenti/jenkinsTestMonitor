const express = require('express');
const { getJenkinsJobData, processJobData } = require('./jenkinsApi');

const app = express();

const pipelineUrls = [
    'http://127.0.0.1:8080/job/test1',
    'http://127.0.0.1:8080/job/test2',
];

function generateColor(index) {
    const hue = index * 137.508; // use golden angle approximation
    return `hsl(${hue}, 50%, 60%)`;
}

app.get('/', async (req, res) => {
    try {
        let allPipelineData = [];
        let totalSuccessCount = 0;
        let totalFailCount = 0;
        let totalUserActivity = {};
        let totalDailyActivity = {};
        let totalJobDurations = [];

        for (const url of pipelineUrls) {
            const jobs = await getJenkinsJobData(url);
            const jobName = jobs.fullName;

            if (jobs && jobs.builds.length > 0) {
                const { successCount, failCount, userActivity, dailyActivity, jobDurations } = await processJobData(jobs.builds);

                totalSuccessCount += successCount;
                totalFailCount += failCount;
                for (const user in userActivity) {
                    totalUserActivity[user] = (totalUserActivity[user] || 0) + userActivity[user];
                }
                for (const day in dailyActivity) {
                    totalDailyActivity[day] = (totalDailyActivity[day] || 0) + dailyActivity[day];
                }
                totalJobDurations.push(...jobDurations.map(job => job.duration));

                allPipelineData.push({ url, successCount, failCount, jobName, userActivity, dailyActivity, jobDurations });
            } else {
                allPipelineData.push({ url, successCount: 0, failCount: 0, jobName, userActivity: {}, dailyActivity: {}, jobDurations: [] });
            }
        }

        let summaryLinks = '';
        let canvasElements = '';
        let chartScripts = '';

        allPipelineData.forEach((pipeline, pipelineIndex) => {

            summaryLinks += `<li><a href="#job-section-${pipelineIndex}">${pipeline.jobName}</a></li>`;


            // Main title for each job
            canvasElements += `<div class="job-section" id="job-section-${pipelineIndex}">

                                   <h2>${pipeline.jobName}</h2>
                                   <div class="chart-row">`;

            // Build status chart
            canvasElements += `<div class="chart">
                                   <h3>Build Status</h3>
                                   <canvas id="buildChart${pipelineIndex}"></canvas>
                               </div>`;
            chartScripts += `
                const ctxBuild${pipelineIndex} = document.getElementById('buildChart${pipelineIndex}').getContext('2d');
                new Chart(ctxBuild${pipelineIndex}, {
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

            // User activity chart
            const userNames = Object.keys(pipeline.userActivity);
            const userRequestCounts = Object.values(pipeline.userActivity);
            const backgroundColors = userNames.map((_, index) => generateColor(index));

            canvasElements += `<div class="chart">
                                   <h3>User Activity</h3>
                                   <canvas id="userActivityChart${pipelineIndex}"></canvas>
                               </div>`;
            chartScripts += `
                const ctxUser${pipelineIndex} = document.getElementById('userActivityChart${pipelineIndex}').getContext('2d');
                new Chart(ctxUser${pipelineIndex}, {
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

            // Daily activity chart
            const activityDates = Object.keys(pipeline.dailyActivity);
            const activityCounts = Object.values(pipeline.dailyActivity);

            canvasElements += `<div class="chart">
                                   <h3>Daily Activity</h3>
                                   <canvas id="dailyActivityChart${pipelineIndex}"></canvas>
                               </div>`;
            chartScripts += `
                const ctxDaily${pipelineIndex} = document.getElementById('dailyActivityChart${pipelineIndex}').getContext('2d');
                new Chart(ctxDaily${pipelineIndex}, {
                    type: 'line',
                    data: {
                        labels: ${JSON.stringify(activityDates)},
                        datasets: [{
                            label: 'Activity Count',
                            data: ${JSON.stringify(activityCounts)},
                            fill: false,
                            borderColor: 'rgb(75, 192, 192)',
                            tension: 0.1
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

            // Job duration chart
            const jobNames = pipeline.jobDurations.map(job => job.jobName);
            const jobTimes = pipeline.jobDurations.map(job => job.duration);

            canvasElements += `<div class="chart">
                                   <h3>Job Duration</h3>
                                   <canvas id="jobDurationChart${pipelineIndex}"></canvas>
                               </div>`;
            chartScripts += `
                const ctxDuration${pipelineIndex} = document.getElementById('jobDurationChart${pipelineIndex}').getContext('2d');
                new Chart(ctxDuration${pipelineIndex}, {
                    type: 'bar',
                    data: {
                        labels: ${JSON.stringify(jobNames)},
                        datasets: [{
                            label: 'Duration (ms)',
                            data: ${JSON.stringify(jobTimes)},
                            backgroundColor: 'rgba(153, 102, 255, 0.2)',
                            borderColor: 'rgba(153, 102, 255, 1)',
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

            canvasElements += `</div></div>`; // Close the chart row and job section
        });

        // Aggregate charts
        const totalUserNames = Object.keys(totalUserActivity);
        const totalUserRequestCounts = Object.values(totalUserActivity);
        const totalBackgroundColors = totalUserNames.map((_, index) => generateColor(index));

        const totalActivityDates = Object.keys(totalDailyActivity);
        const totalActivityCounts = Object.values(totalDailyActivity);
        
        let totalJobTimes = 0;
        totalJobDurations.forEach(duration => {
            totalJobTimes += duration;
        });

        const totalJobNames = totalJobDurations.map((_, index) => `Job ${index + 1}`);
        
        // Aggregate chart elements
        canvasElements += `<div class="chart">
                               <h3>Total Build Status</h3>
                               <canvas id="totalBuildChart"></canvas>
                           </div>
                           <div class="chart">
                               <h3>Total User Activity</h3>
                               <canvas id="totalUserActivityChart"></canvas>
                           </div>
                           <div class="chart">
                               <h3>Total Daily Activity</h3>
                               <canvas id="totalDailyActivityChart"></canvas>
                           </div>
                           <div class="chart">
                               <h3>Total Job Duration</h3>
                               <canvas id="totalJobDurationChart"></canvas>
                           </div>`;

        


        // Scripts for aggregate charts
        chartScripts += `
            // Script for Total Build Status Chart
            const ctxTotalBuild = document.getElementById('totalBuildChart').getContext('2d');
            new Chart(ctxTotalBuild, {
                type: 'bar',
                data: {
                    labels: ['Total Successful', 'Total Failed'],
                    datasets: [{
                        label: 'Total Builds',
                        data: [${totalSuccessCount}, ${totalFailCount}],
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
            });

            // Script for Total User Activity Chart
            const ctxTotalUserActivity = document.getElementById('totalUserActivityChart').getContext('2d');
            new Chart(ctxTotalUserActivity, {
                type: 'bar',
                data: {
                    labels: ${JSON.stringify(totalUserNames)},
                    datasets: [{
                        label: 'Total Number of Requests',
                        data: ${JSON.stringify(totalUserRequestCounts)},
                        backgroundColor: ${JSON.stringify(totalBackgroundColors)},
                        borderColor: ${JSON.stringify(totalBackgroundColors)},
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
            });

            // Script for Total Daily Activity Chart
            const ctxTotalDailyActivity = document.getElementById('totalDailyActivityChart').getContext('2d');
            new Chart(ctxTotalDailyActivity, {
                type: 'line',
                data: {
                    labels: ${JSON.stringify(totalActivityDates)},
                    datasets: [{
                        label: 'Total Activity Count',
                        data: ${JSON.stringify(totalActivityCounts)},
                        fill: false,
                        borderColor: 'rgb(54, 162, 235)',
                        tension: 0.1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });

            // Script for Total Job Duration Chart
            const ctxTotalJobDuration = document.getElementById('totalJobDurationChart').getContext('2d');
            new Chart(ctxTotalJobDuration, {
                type: 'bar',
                data: {
                    labels: ['Total Job Duration'],
                    datasets: [{
                        label: 'Duration (ms)',
                        data: [${totalJobTimes}],
                        backgroundColor: 'rgba(255, 206, 86, 0.2)',
                        borderColor: 'rgba(255, 206, 86, 1)',
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
            });
        `;

        // ... (remaining code)



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
                    .chart-row {
                        display: flex;
                        flex-wrap: wrap;
                        justify-content: space-around;
                    }
                    .chart {
                        flex: 1;
                        min-width: 45%;
                        max-width: 50%;
                        margin: 10px;
                    }
                    .job-section {
                        border: 1px solid #ddd;
                        padding: 15px;
                        margin-bottom: 20px;
                    }
                    .job-section h2 {
                        text-align: center;
                    }
                    #summary {
                        list-style: none;
                        padding: 0;
                    }
                    #summary li {
                        display: inline;
                        margin-right: 10px;
                    }
                    #summary a {
                        text-decoration: none;
                        color: blue;
                    }
                </style>
                <title>Jenkins Job Status</title>
                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            </head>
            <body>
                <h1>Jenkins Build Analysis</h1>
                <ul id="summary">
                    ${summaryLinks}
                </ul>
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

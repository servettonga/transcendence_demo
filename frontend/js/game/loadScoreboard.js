import { updatePageContent, __ } from "../lang/i18n.js";
import { isLoggedIn } from "../utils/session.js";

export async function loadScoreboard() {
    const main = document.getElementById('mainContent');

    document.getElementById("myGamesModalClose").click();

    fetch('scoreboard.html')
        .then(response => response.text())
        .then(html => {
            main.innerHTML = html;
            requestAnimationFrame(() => {
                checkLogin();
                updateScoreboard();
            });
        })
        .catch(error => console.error("Error loading scoreboard.html:", error));
}

export function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
}

export async function updateScoreboard() {
    console.log("Loading scoreboard data...");

    destroyExistingCharts();

    const token = isLoggedIn(false);

    try {
        const isMockMode = localStorage.getItem('accessToken')?.startsWith('mock_');

        let topPlayersData = getMockTopPlayers();
        let scoreDistData = getMockScoreDistribution();
        let durationDistData = getMockDurationDistribution();

        if (!isMockMode) {
            // Original API calls - these will be intercepted by mockApiPatch.js
            const [topPlayersResponse, scoreDistResponse, durationDistResponse] = await Promise.all([
                fetch('/api/stats/top-players/', {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                }),
                fetch('/api/stats/score-distribution/', {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                }),
                fetch('/api/stats/duration-distribution/', {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                })
            ]);

            topPlayersData = await topPlayersResponse.json();
            scoreDistData = await scoreDistResponse.json();
            durationDistData = await durationDistResponse.json();
        }

        try {
            renderTopPlayersChart(topPlayersData);
        } catch (e) {
            console.error("Error rendering top players chart:", e);
        }

        try {
            renderScoreDistributionChart(scoreDistData);
        } catch (e) {
            console.error("Error rendering score distribution chart:", e);
        }

        try {
            renderDurationDistributionChart(durationDistData);
        } catch (e) {
            console.error("Error rendering duration chart:", e);
        }

        loadScoreboardTable();

    } catch (error) {
        console.error('Error loading scoreboard data:', error);
        document.getElementById('topPlayersChart').innerHTML = '<div class="alert alert-danger">Failed to load player statistics</div>';
        document.getElementById('scoreDistributionChart').innerHTML = '<div class="alert alert-danger">Failed to load score distribution</div>';
        document.getElementById('gameDurationChart').innerHTML = '<div class="alert alert-danger">Failed to load duration statistics</div>';
    }
}

function getMockTopPlayers() {
    return {
        labels: ['Player1', 'Player2', 'Player3', 'Admin User'],
        datasets: [
            {
                label: 'Wins',
                data: [8, 7, 7, 15],
                backgroundColor: 'rgba(75, 192, 192, 0.6)'
            },
            {
                label: 'Losses',
                data: [2, 4, 6, 3],
                backgroundColor: 'rgba(255, 99, 132, 0.6)'
            }
        ]
    };
}

function getMockScoreDistribution() {
    return {
        labels: ['0-2', '3-5', '6-8', '9-10'],
        datasets: [
            {
                label: 'Number of Games',
                data: [1, 3, 8, 12],
                backgroundColor: 'rgba(54, 162, 235, 0.6)'
            }
        ]
    };
}

function getMockDurationDistribution() {
    return {
        labels: ['< 1 min', '1-2 mins', '2-3 mins', '3-5 mins', '> 5 mins'],
        datasets: [
            {
                label: 'Number of Games',
                data: [2, 8, 10, 5, 1],
                backgroundColor: 'rgba(153, 102, 255, 0.6)'
            }
        ]
    };
}

function renderTopPlayersChart(data) {
    const canvas = document.getElementById('topPlayersChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (window.topPlayersBarChart) {
        window.topPlayersBarChart.destroy();
        window.topPlayersBarChart = null;
    }

    canvas.height = 250;

    window.topPlayersBarChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Games'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Players'
                    }
                }
            }
        }
    });
}

function renderScoreDistributionChart(data) {
    const canvas = document.getElementById('scoreDistributionChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (window.scoreDistChart) {
        window.scoreDistChart.destroy();
        window.scoreDistChart = null;
    }

    canvas.height = 250;

    window.scoreDistChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Games'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Score Range'
                    }
                }
            }
        }
    });
}

function renderDurationDistributionChart(data) {
    const canvas = document.getElementById('gameDurationChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (window.durationChart) {
        window.durationChart.destroy();
        window.durationChart = null;
    }

    canvas.height = 250;

    window.durationChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Games'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Duration'
                    }
                }
            }
        }
    });
}

async function ensureChartJsLoaded() {
    return new Promise(resolve => {
        if (window.Chart) {
            resolve();
            return;
        }

        const chartJsScript = document.createElement('script');
        chartJsScript.src = "https://cdn.jsdelivr.net/npm/chart.js";
        chartJsScript.onload = () => resolve();
        document.head.appendChild(chartJsScript);
    });
}

function destroyExistingCharts() {
    if (window.topPlayersBarChart) {
        window.topPlayersBarChart.destroy();
        window.topPlayersBarChart = null;
    }

    if (window.scoreDistChart) {
        window.scoreDistChart.destroy();
        window.scoreDistChart = null;
    }

    if (window.durationChart) {
        window.durationChart.destroy();
        window.durationChart = null;
    }

    const chartCanvases = ['topPlayersChart', 'scoreDistChart', 'durationChart'];
    chartCanvases.forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    });
}

// Main function to create all charts
async function createScoreboardCharts(gamesData) {
    if (!gamesData || gamesData.length === 0) {
        console.log('No game data available to create charts');
        return;
    }

    await ensureChartJsLoaded();
    destroyExistingCharts();

    createTopPlayersChart(gamesData);
    createScoreDistributionChart(gamesData);
    createGameDurationChart(gamesData);
}

function createTopPlayersChart(gamesData) {
    // Clean up any existing chart
    const ctx = document.getElementById('topPlayersChart');
    if (!ctx) return;

    // Process data - count wins by player
    const playerWins = {};
    gamesData.forEach(game => {
        const winnerUsername = game.winner_username;
        if (!winnerUsername) return;

        if (!playerWins[winnerUsername])
            playerWins[winnerUsername] = 0;
        playerWins[winnerUsername]++;
    });

    // Sort players by wins and get top 10
    const topPlayers = Object.entries(playerWins)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    // Create chart
    ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topPlayers.map(player => player[0]),
            datasets: [{
                label: 'Wins',
                data: topPlayers.map(player => player[1]),
                backgroundColor: 'rgba(255,153,47,0.8)',
                borderColor: 'rgb(236,163,83)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Wins'
                    }
                }
            }
        }
    });
}

function createScoreDistributionChart(gamesData) {
    const ctx = document.getElementById('scoreDistributionChart');
    if (!ctx) return;

    // Group games by score difference
    const scoreDifferences = {};
    gamesData.forEach(game => {
        const diff = Math.abs(game.score_player1 - game.score_player2);
        const diffKey = diff >= 5 ? '5+' : String(diff);

        if (!scoreDifferences[diffKey]) {
            scoreDifferences[diffKey] = 0;
        }
        scoreDifferences[diffKey]++;
    });

    // Prepare labels and data
    const diffLabels = ['0', '1', '2', '3', '4', '5+'];
    const diffData = diffLabels.map(label => scoreDifferences[label] || 0);

    // Create chart
    ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: diffLabels,
            datasets: [{
                label: 'Number of Games',
                data: diffData,
                backgroundColor: 'rgba(124,75,255,0.8)',
                borderColor: 'rgb(153,126,251)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: (tooltipItems) => {
                            const diff = tooltipItems[0].label;
                            return diff === '5+' ? 'Score difference of 5 or more' : `Score difference of ${diff}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Games'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Score Difference'
                    }
                }
            }
        }
    });
}

function createGameDurationChart(gamesData) {
    const ctx = document.getElementById('gameDurationChart');
    if (!ctx) return;

    // Convert durations to seconds
    const durationSeconds = gamesData.map(game => {
        if (!game.duration) return 0;

        const parts = game.duration.split(':');
        if (parts.length !== 3) return 0;

        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseInt(parts[2].split('.')[0]) || 0;

        return (hours * 3600) + (minutes * 60) + seconds;
    });

    // Group durations into ranges
    const durationRanges = {
        '0-30s': 0,
        '30s-1m': 0,
        '1m-2m': 0,
        '2m-3m': 0,
        '3m+': 0
    };

    durationSeconds.forEach(seconds => {
        if (seconds <= 30) durationRanges['0-30s']++;
        else if (seconds <= 60) durationRanges['30s-1m']++;
        else if (seconds <= 120) durationRanges['1m-2m']++;
        else if (seconds <= 180) durationRanges['2m-3m']++;
        else durationRanges['3m+']++;
    });

    // Create chart
    ctx.chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(durationRanges),
            datasets: [{
                data: Object.values(durationRanges),
                backgroundColor: [
                    'rgba(255,70,111,0.8)',
                    'rgba(33,153,232,0.8)',
                    'rgba(255,202,58,0.8)',
                    'rgba(52,189,189,0.8)',
                    'rgba(153, 102, 255, 0.8)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

export async function loadScoreboardTable() {
    const scoreboard = document.getElementById('scoreboard-container');
    if (!scoreboard) return;

    const token = localStorage.getItem('accessToken');
    const isMockMode = token?.startsWith('mock_');

    try {
        // In mock mode, use mock data directly
        let gameHistory;
        if (isMockMode) {
            gameHistory = getMockGameHistory();
        } else {
            const response = await fetch('/api/pong/history/', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            gameHistory = await response.json();
        }

        // Create the table HTML
        let tableHTML = `
            <table class="table table-striped table-hover">
                <thead>
                    <tr>
                        <th>${__('player_column')} 1</th>
                        <th>${__('player_column')} 2</th>
                        <th>${__('score')}</th>
                        <th>${__('win_column')}</th>
                        <th>${__('duration')}</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // Add rows for each game
        if (gameHistory && gameHistory.length > 0) {
            gameHistory.forEach(game => {
                const winnerClass = game.player1_username === game.winner_username ?
                    'text-success' : (game.player2_username === game.winner_username ? 'text-danger' : '');

                tableHTML += `
                    <tr>
                        <td class="${game.player1_username === game.winner_username ? 'text-success' : ''}">${game.player1_username}</td>
                        <td class="${game.player2_username === game.winner_username ? 'text-success' : ''}">${game.player2_username}</td>
                        <td>${game.score_player1} - ${game.score_player2}</td>
                        <td>${game.winner_username || '-'}</td>
                        <td>${game.duration || '-'}</td>
                    </tr>
                `;
            });
        } else {
            tableHTML += `
                <tr>
                    <td colspan="5" class="text-center">${__('no_games_available')}</td>
                </tr>
            `;
        }

        tableHTML += `
                </tbody>
            </table>
        `;

        scoreboard.innerHTML = tableHTML;

    } catch (error) {
        console.error('Error loading scoreboard table:', error);
        scoreboard.innerHTML = `<div class="alert alert-danger">Failed to load scoreboard data</div>`;
    }
}

function getMockGameHistory() {
    return [
        {
            id: 1,
            player1_username: 'player1',
            player2_username: 'player2',
            score_player1: 10,
            score_player2: 3,
            winner_username: 'player1',
            duration: '02:45'
        },
        {
            id: 2,
            player1_username: 'player2',
            player2_username: 'player3',
            score_player1: 10,
            score_player2: 7,
            winner_username: 'player2',
            duration: '03:20'
        },
        {
            id: 3,
            player1_username: 'player1',
            player2_username: 'player3',
            score_player1: 8,
            score_player2: 10,
            winner_username: 'player3',
            duration: '03:05'
        }
    ];
}

export function cleanupScoreboard() {
    console.log("Cleaning up scoreboard resources");
    destroyExistingCharts();

    // Clear any pending updates or timers
    if (window.scoreboardUpdateTimer) {
        clearTimeout(window.scoreboardUpdateTimer);
        window.scoreboardUpdateTimer = null;
    }
}

import { __, updatePageContent } from '../lang/i18n.js';

export function ensureChartJsLoaded() {
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

// Main function to create all charts
export async function createCharts(userGames) {
    try {
        // Use provided data or fetch if none provided
        if (!userGames)
            userGames = await fetchGameData();

        if (!userGames || userGames.length === 0) {
            console.log('No game data available to create charts');
            return;
        }

        await ensureChartJsLoaded();
        destroyExistingCharts();

        createWinLossChart(userGames);
        createScoreDistributionChart(userGames);
        createDurationChart(userGames);
        createOpponentsChart(userGames);

        updatePageContent();
    } catch (error) {
        console.error('Error creating charts:', error);
    }
}

function destroyExistingCharts() {
    const chartIds = ['winLossChart', 'scoreDistributionChart', 'durationChart', 'opponentsChart'];
    chartIds.forEach(id => {
        const chartElement = document.getElementById(id);
        if (chartElement && chartElement.chart)
            chartElement.chart.destroy();
    });
}

async function fetchGameData() {
    const token = localStorage.getItem('accessToken');
    if (!token) return [];

    try {
        const response = await fetch('/api/pong/history/', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        const currentUser = localStorage.getItem('username');

        return data.filter(game =>
            game.player1_username === currentUser ||
            game.player2_username === currentUser
        );
    } catch (error) {
        console.error('Error fetching game data:', error);
        return [];
    }
}

export function createWinLossChart(userGames) {
    const currentUser = localStorage.getItem('username');
    const gamesWon = userGames.filter(game => game.winner_username === currentUser).length;
    const gamesLost = userGames.length - gamesWon;

    const ctx = document.getElementById('winLossChart');
    if (!ctx) return;

    ctx.chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [__('games_won'), __('games_lost')],
            datasets: [{
                data: [gamesWon, gamesLost],
                backgroundColor: ['#00b779', '#dc3545'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                title: {
                    display: false,
                    text: __('win_loss_ratio'),
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

function createScoreDistributionChart(userGames) {
    const currentUser = localStorage.getItem('username');
    const userScores = [];
    const opponentScores = [];

    userGames.forEach(game => {
        const isPlayer1 = game.player1_username === currentUser;
        userScores.push(isPlayer1 ? game.score_player1 : game.score_player2);
        opponentScores.push(isPlayer1 ? game.score_player2 : game.score_player1);
    });

    // Group scores into ranges
    const scoreRanges = ['0-2', '3-5', '6-8', '9+'];
    const userScoreData = [
        userScores.filter(s => s >= 0 && s <= 2).length,
        userScores.filter(s => s >= 3 && s <= 5).length,
        userScores.filter(s => s >= 6 && s <= 8).length,
        userScores.filter(s => s >= 9).length
    ];

    const opponentScoreData = [
        opponentScores.filter(s => s >= 0 && s <= 2).length,
        opponentScores.filter(s => s >= 3 && s <= 5).length,
        opponentScores.filter(s => s >= 6 && s <= 8).length,
        opponentScores.filter(s => s >= 9).length
    ];

    const ctx = document.getElementById('scoreDistributionChart');
    if (!ctx) return;

    ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: scoreRanges,
            datasets: [
                {
                    label: 'Your Scores',
                    data: userScoreData,
                    backgroundColor: 'rgba(19,165,255,0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Opponent Scores',
                    data: opponentScoreData,
                    backgroundColor: 'rgba(255,48,91,0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: false,
                    text: __('score_distribution'),
                    font: {
                        size: 16
                    }
                },
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: __('number_of_games')
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: __('score_range')
                    }
                }
            }
        }
    });
}

function createDurationChart(userGames) {
    const durationSeconds = userGames.map(game => {
        if (!game.duration) return 0;

        if (typeof game.duration === 'string' && game.duration.includes(':')) {
            try {
                const parts = game.duration.split(':');
                if (parts.length !== 3) return 0;

                const hours = parseInt(parts[0], 10) || 0;
                const minutes = parseInt(parts[1], 10) || 0;

                // Handle seconds and microseconds
                const secParts = parts[2].split('.');
                const seconds = parseInt(secParts[0], 10) || 0;

                // Convert everything to total seconds
                return (hours * 3600) + (minutes * 60) + seconds;
            } catch (error) {
                console.error('Error parsing duration:', error);
                return 0;
            }
        }

        if (typeof game.duration === 'string') {
            let totalSeconds = 0;

            // Extract minutes if present (like "2m" or "2m 30s")
            const minutesMatch = game.duration.match(/(\d+)m/);
            if (minutesMatch)
                totalSeconds += parseInt(minutesMatch[1], 10) * 60;

            // Extract seconds if present (like "30s" or "2m 30s")
            const secondsMatch = game.duration.match(/(\d+)s/);
            if (secondsMatch)
                totalSeconds += parseInt(secondsMatch[1], 10);

            // If nothing matched but there's a number, try parsing it directly
            if (totalSeconds === 0 && /\d+/.test(game.duration))
                totalSeconds = parseInt(game.duration, 10);

            return totalSeconds;
        }

        // If it's a number or can be converted to one
        return parseFloat(game.duration) || 0;
    });
    const maxDuration = Math.max(...durationSeconds.filter(d => d > 0)) || 0;

    // Choose appropriate ranges based on the actual data
    let durationRanges, durationData;

    if (maxDuration < 30) {
        durationRanges = ['0-15 sec', '15-30 sec', '30-45 sec', '45+ sec'];
        durationData = [
            durationSeconds.filter(d => d >= 0 && d < 15).length,
            durationSeconds.filter(d => d >= 15 && d < 30).length,
            durationSeconds.filter(d => d >= 30 && d < 45).length,
            durationSeconds.filter(d => d >= 45).length
        ];
    } else if (maxDuration < 60) {
        durationRanges = ['0-20 sec', '20-40 sec', '40-60 sec', '60+ sec'];
        durationData = [
            durationSeconds.filter(d => d >= 0 && d < 20).length,
            durationSeconds.filter(d => d >= 20 && d < 40).length,
            durationSeconds.filter(d => d >= 40 && d < 60).length,
            durationSeconds.filter(d => d >= 60).length
        ];
    } else {
        durationRanges = ['0-30 sec', '30-60 sec', '1-2 min', '2+ min'];
        durationData = [
            durationSeconds.filter(d => d >= 0 && d < 30).length,
            durationSeconds.filter(d => d >= 30 && d < 60).length,
            durationSeconds.filter(d => d >= 60 && d < 120).length,
            durationSeconds.filter(d => d >= 120).length
        ];
    }

    // Create the chart
    const ctx = document.getElementById('durationChart');
    if (!ctx) return;

    ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: durationRanges,
            datasets: [{
                label: __('number_of_games'),
                data: durationData,
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: __('number_of_games')
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: __('duration')
                    }
                }
            }
        }
    });
}

function createOpponentsChart(userGames) {
    const currentUser = localStorage.getItem('username');
    const opponentStats = {};

    // Calculate stats for each opponent
    userGames.forEach(game => {
        const isPlayer1 = game.player1_username === currentUser;
        const opponent = isPlayer1 ? game.player2_username : game.player1_username;

        if (!opponentStats[opponent])
            opponentStats[opponent] = { games: 0, wins: 0 };

        opponentStats[opponent].games++;
        if (game.winner_username === currentUser)
            opponentStats[opponent].wins++;
    });

    // Get top 5 opponents by number of games
    const topOpponents = Object.entries(opponentStats)
        .sort((a, b) => b[1].games - a[1].games)
        .slice(0, 5);

    const ctx = document.getElementById('opponentsChart');
    if (!ctx) return;

    // No opponents or chart element not found
    if (topOpponents.length === 0) {
        ctx.parentNode.style.display = 'none';
        return;
    }

    ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topOpponents.map(o => o[0]),
            datasets: [{
                label: __('win_rate'),
                data: topOpponents.map(o => (o[1].wins / o[1].games * 100).toFixed(1)),
                backgroundColor: 'rgba(110,39,216,0.7)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                title: {
                    display: false,
                    text: __('performance_against_opponents'),
                    font: {
                        size: 16
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: __('win_rate')
                    }
                }
            }
        }
    });
}

# Tournament Flow

## Tournament Flow For The Creator

```md
  ┌───────────────┐      ┌───────────────┐      ┌───────────────┐
  │               │      │               │      │               │
  │  REGISTRATION ├─────►│  IN_PROGRESS  ├─────►│   COMPLETED   │
  │               │      │               │      │               │
  └───────────────┘      └───────────────┘      └───────────────┘
         ▲                     │
         │                     │
         │                     ▼
  ┌──────┴──────┐      ┌───────────────┐
  │             │      │ Round 1,2,3.. │
  │  Creation   │      │ Match Winners │
  │             │      │   Advance     │
  └─────────────┘      └───────────────┘
```

1. **Tournament Creation**:

- User creates a tournament providing a name, description, and max players (4, 8, or 16)
- Creator is automatically joined as the first participant
- Tournament status is set to `REGISTRATION`

2. **Joining Phase**:

- Tournament appears in the list of available tournaments
- Other users can join until the maximum player count is reached
- Real-time updates through WebSockets notify all participants when someone joins

3. **Tournament Start**:

- **Only the creator** can start the tournament
- This changes status to `IN_PROGRESS` and generates the first round of matches
- Players are randomly paired for first-round matches

4. **Match Play**:

- Players see their matchups in the tournament bracket
- Either player in a match can create a game
- Winners advance automatically to next rounds

```md
Round 1            Round 2           Finals
┌────────┐        ┌────────┐        ┌────────┐
│Player A│──┐     │        │        │        │
└────────┘  │     │        │        │        │
            ├────►│ Winner │──┐     │        │
┌────────┐  │     │ A or B │  │     │        │
│Player B│──┘     └────────┘  │     │        │
└────────┘                    │     │ Final  │
                              ├────►│ Winner │
┌────────┐        ┌────────┐  │     │        │
│Player C│──┐     │        │  │     │        │
└────────┘  │     │        │  │     │        │
            ├────►│ Winner │──┘     │        │
┌────────┐  │     │ C or D │        │        │
│Player D│──┘     └────────┘        └────────┘
└────────┘                          
```

## Non-Creator Players' Experience

```md
┌──────────┐     ┌────────────┐     ┌────────────┐     ┌──────────┐
│          │     │            │     │            │     │          │
│  Browse  ├────►│   Join     ├────►│ Play Match ├────►│ Advance  │
│          │     │            │     │            │     │          │
└──────────┘     └────────────┘     └────────────┘     └──────────┘
                       ▲                                     │
                       │                                     │
                       └─────────────────────────────────────┘
```

1. **Browse & Join Tournaments**

- Players see all available tournaments in the tournament list
- They can join any tournament in `REGISTRATION` status
- The UI should show "Register" button for tournaments they haven't joined yet

2. **Wait for Tournament Start**

- Once joined, players see their name in the participant list
- They receive real-time notifications via WebSockets when other players join
- They must wait for the creator to start the tournament (only the creator has this power)

3. **Participate in Matches**

- When the tournament starts, players see the bracket with their matchups
- For their own matches, they see a `Play Match` button (the button triggers the API endpoint `create-match-game` 
which creates a new Pong game instance for that match)
- Either player in a match can create the game (first one to click creates it)
- When a game is created, both players receive a notification

4. **Play and Advance**

- Players compete in their assigned games
- Winners automatically advance to the next round
- Players can view the entire bracket to see tournament progress

## TO-DO List For Frontend User Experience

1. **Tournament List View**:

- Show all tournaments with status, player count, and appropriate action buttons
- Different buttons based on status and whether the user has joined

```md
┌──────────────────────────────────────────────────┐
│ TOURNAMENTS                            [Create+] │
├──────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐   │
│ │ March Madness                              │   │
│ │ Status: REGISTRATION  Players: 6/8         │   │
│ │                              [Register]    │   │
│ └────────────────────────────────────────────┘   │
│                                                  │
│ ┌────────────────────────────────────────────┐   │
│ │ Weekly Championship                        │   │
│ │ Status: IN_PROGRESS  Players: 4/4          │   │
│ │                             [View Bracket] │   │
│ └────────────────────────────────────────────┘   │
│                                                  │
└──────────────────────────────────────────────────┘
```

2. **Tournament Detail View**:

- Show the participant list
```md
  ┌──────────────────────────────────────────────────┐
  │ MARCH MADNESS                           [Back]   │
  │ Status: REGISTRATION  Players: 6/8               │
  │                                   [Start]        │
  ├──────────────────────────────────────────────────┤
  │ PARTICIPANTS:                                    │
  │ • Player1 (creator)                              │
  │ • Player2                                        │
  │ • Player3                                        │
  │ • Player4                                        │
  │ • Player5                                        │
  │ • Player6                                        │
  └──────────────────────────────────────────────────┘
```
- Display the tournament bracket
```md
  ┌──────────────────────────────────────────────────────────────────┐
  │ MARCH MADNESS - IN PROGRESS                            [Back]    │
  ├──────────────────────────────────────────────────────────────────┤
  │                                                                  │
  │  Round 1                 Round 2               Final             │
  │                                                                  │
  │  Player1 ─┐                                                      │
  │           ├─ Winner1 ─┐                                          │
  │  Player2 ─┘           │                                          │
  │                       ├─── Champion                              │
  │  Player3 ─┐           │                                          │
  │           ├─ Winner2 ─┘                                          │
  │  Player4 ─┘                                                      │
  │                                                                  │
  │  Player5 ─┐                                                      │
  │           ├─ [Play Match]                                        │
  │  You ─────┘                                                      │
  │                                                                  │
  └──────────────────────────────────────────────────────────────────┘
```
- Include action buttons based on a user role:
  - Creator: Start Tournament button (only in `REGISTRATION` status)
  - Participant: Play Match button for their matches
  - Anyone: View tournament bracket and results


3. **Notifications**:

- Connect WebSocket for real-time updates
- Display toast messages when:
  - Players join a tournament you're in
  - Tournament starts
  - Your match is ready
  - The tournament advances to the next round
```md
  ┌────────────────────────────┐
  │ 🎮 Tournament Started!     │
  │ March Madness has begun    │
  │                  [View] ×  │
  └────────────────────────────┘
  
  ┌────────────────────────────┐
  │ 👤 Player joined!          │
  │ Player7 joined the         │
  │ Weekly Championship        │
  │                  [View] ×  │
  └────────────────────────────┘
```

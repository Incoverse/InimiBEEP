interface IBEEPConfig {
    pushupIncrements: {
        noSwearing: number // Pushups to add when the broadcaster swears
        wordBan: number // Pushups to add when the broadcaster says a banned word
        accent: number // Pushups to add when the broadcaster fails a specific accent
        customChallenge: number // Pushups to add when the broadcaster fails the custom challenge
        swedishOnly: number // Pushups to add when the broadcaster speaks English during Swedish Only
        noLaughing: number // Pushups to add when the broadcaster laughs during No Laughing
        stoneface: number // Pushups to add when the broadcaster fails to maintain a stone face
        theTower: number // Pushups to add when the broadcaster looks or plays The Tower

        onSub: number // Pushups to add when a user subscribes
    };
    timerLengths: {
        noSwearing: number // in minutes
        wordBan: number // in minutes
        accent: number // in minutes
        customChallenge: number // in minutes
        swedishOnly: number // in minutes
        noLaughing: number // in minutes
        BDLG: number // in minutes
        emoteOnly: number // in minutes
        stoneface: number // in minutes
    };


    timeoutDuration: number; // in seconds
    emoteOnlyDuration: number; // in seconds

    discordInvite: string;
}
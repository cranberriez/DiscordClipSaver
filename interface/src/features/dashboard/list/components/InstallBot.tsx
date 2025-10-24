export function InstallBot() {
    const invitePath = `/api/discord/bot/invite`;

    return (
        <div className="flex flex-1 items-center gap-2">
            <a href={invitePath} className="btn btn-primary">
                Install Bot
            </a>
        </div>
    );
}

import React, {useCallback, useRef} from 'react';
import Dialog, {showDialog, DialogProps} from 'components/Dialog';
import ExternalLink from 'components/ExternalLink';
import Icon from 'components/Icon';
import listenbrainzSettings from '../listenbrainzSettings';
import './ListenBrainzLoginDialog.scss';

export async function showListenBrainzLoginDialog(): Promise<string> {
    return showDialog(ListenBrainzLoginDialog, true);
}

export default function ListenBrainzLoginDialog(props: DialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const userNameRef = useRef<HTMLInputElement>(null);
    const tokenRef = useRef<HTMLInputElement>(null);
    const profileUrl = 'https://listenbrainz.org/profile/';

    const login = useCallback(async () => {
        try {
            const userId = userNameRef.current!.value;
            const token = tokenRef.current!.value;

            listenbrainzSettings.userId = userId;

            const response = await fetch(`https://api.listenbrainz.org/1/validate-token`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Token ${token}`,
                },
            });

            if (!response.ok) {
                throw response;
            }

            const {valid, user_name} = await response.json();

            if (!valid) {
                throw Error('Invalid token.');
            }

            if (user_name !== userId) {
                throw Error('Token not valid for this user.');
            }

            dialogRef.current!.close(JSON.stringify({userId, token}));
        } catch (err) {
            console.error(err); // TODO: Show error in the UI
        }
    }, []);

    const handleSubmit = useCallback(
        (event: React.FormEvent) => {
            event.preventDefault();
            login();
        },
        [login]
    );

    return (
        <Dialog
            {...props}
            className="listenbrainz-login-dialog"
            title="Login to ListenBrainz"
            ref={dialogRef}
        >
            <form method="dialog" onSubmit={handleSubmit}>
                <div className="table-layout">
                    <p>
                        <label htmlFor="listenbrainz-username">User:</label>
                        <input
                            type="text"
                            id="listenbrainz-username"
                            autoFocus
                            required
                            spellCheck={false}
                            autoComplete="off"
                            autoCapitalize="off"
                            ref={userNameRef}
                        />
                    </p>
                    <p>
                        <label htmlFor="listenbrainz-token">Token:</label>
                        <input type="password" id="listenbrainz-token" required ref={tokenRef} />
                    </p>
                </div>
                <p className="listenbrainz-link">
                    <ExternalLink href={profileUrl}>
                        <Icon name="listenbrainz" />
                        {profileUrl}
                    </ExternalLink>
                </p>
                <footer className="dialog-buttons">
                    <button type="button" value="#cancel">
                        Cancel
                    </button>
                    <button>Login</button>
                </footer>
            </form>
        </Dialog>
    );
}

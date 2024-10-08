import type {Observable} from 'rxjs';
import {
    EMPTY,
    BehaviorSubject,
    Subject,
    distinctUntilChanged,
    filter,
    merge,
    switchMap,
} from 'rxjs';
import {SetReturnType} from 'type-fest';
import AudioManager from 'types/AudioManager';
import Player from 'types/Player';
import {partition} from 'utils';

export default class OmniPlayer<T, S = T> implements Player<T> {
    private readonly element = document.createElement('div');
    private readonly players: Player<S>[] = [];
    private readonly player$ = new BehaviorSubject<Player<S> | null>(null);
    private readonly error$ = new Subject<unknown>();
    private stopped = true;
    #loadError: Error | null = null;
    #autoplay = false;
    #loop = false;
    #muted = false;
    #volume = 1;
    #width = 0;
    #height = 0;

    constructor(
        id: string,
        private readonly selectPlayer: SetReturnType<Player<T>['load'], Player<S> | null>,
        private readonly loadPlayer: (player: Player<S>, src: T) => void,
        private readonly audio?: Pick<AudioManager, 'volume'>
    ) {
        this.element.id = id;
    }

    get autoplay(): boolean {
        return this.#autoplay;
    }

    set autoplay(autoplay: boolean) {
        this.#autoplay = autoplay;
        if (this.currentPlayer) {
            this.currentPlayer.autoplay = autoplay;
        }
    }

    get hidden(): boolean {
        return this.element.hidden;
    }

    set hidden(hidden: boolean) {
        this.element.hidden = hidden;
        if (this.currentPlayer) {
            this.currentPlayer.hidden = hidden;
        }
    }

    get loop(): boolean {
        return this.#loop;
    }

    set loop(loop: boolean) {
        this.#loop = loop;
        this.players.forEach((player) => (player.loop = loop));
    }

    get muted(): boolean {
        return this.#muted;
    }

    set muted(muted: boolean) {
        this.#muted = muted;
        if (this.currentPlayer) {
            this.currentPlayer.muted = muted;
        }
        if (this.audio) {
            this.audio.volume = muted ? 0 : this.volume;
        }
    }

    get volume(): number {
        return this.#volume;
    }

    set volume(volume: number) {
        this.#volume = volume;
        this.players.forEach((player) => (player.volume = volume));
        if (this.audio) {
            this.audio.volume = this.muted ? 0 : volume;
        }
    }

    observeCurrentTime(): Observable<number> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => (player ? player.observeCurrentTime() : EMPTY)),
            distinctUntilChanged()
        );
    }

    observeDuration(): Observable<number> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => (player ? player.observeDuration() : EMPTY)),
            distinctUntilChanged()
        );
    }

    observeEnded(): Observable<void> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => (player ? player.observeEnded() : EMPTY))
        );
    }

    observeError(): Observable<unknown> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => (player ? merge(this.error$, player.observeError()) : EMPTY)),
            filter(() => !this.stopped)
        );
    }

    observePlaying(): Observable<void> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => (player ? player.observePlaying() : EMPTY))
        );
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.appendChild(this.element);
    }

    load(src: T): void {
        const prevPlayer = this.currentPlayer;
        const nextPlayer = this.selectPlayer(src);

        this.player$.next(null); // turn off event streams

        if (prevPlayer && prevPlayer !== nextPlayer) {
            prevPlayer.autoplay = false;
            prevPlayer.muted = true;
            prevPlayer.hidden = true;
            prevPlayer.stop();
        }

        if (this.autoplay) {
            this.stopped = false;
        }

        this.loadError = null;

        if (nextPlayer && !this.players.includes(nextPlayer)) {
            this.loadError = Error('Player not registered');
            return;
        }

        this.player$.next(nextPlayer);

        if (nextPlayer) {
            try {
                nextPlayer.autoplay = this.autoplay;
                this.loadPlayer(nextPlayer, src);
                nextPlayer.muted = this.muted;
                nextPlayer.hidden = this.hidden;
            } catch (err: any) {
                this.loadError = Error(err?.message || 'Failed to load');
            }
        } else {
            this.loadError = Error('No player found');
        }
    }

    play(): void {
        this.stopped = false;
        this.autoplay = true;
        if (this.loadError) {
            this.error$.next(this.loadError);
        } else {
            this.currentPlayer?.play();
        }
    }

    pause(): void {
        this.autoplay = false;
        this.currentPlayer?.pause();
    }

    stop(): void {
        this.stopped = true;
        this.autoplay = false;
        this.currentPlayer?.stop();
    }

    seek(time: number): void {
        this.currentPlayer?.seek(time);
    }

    resize(width: number, height: number): void {
        this.#width = width;
        this.#height = height;
        if (width * height > 0) {
            this.players.forEach((player) => player.resize(width, height));
        }
    }

    registerPlayers(players: readonly Player<S>[]): void {
        players
            .filter((player) => !this.players.includes(player))
            .forEach((player) => {
                player.muted = true;
                player.hidden = true;
                player.autoplay = this.autoplay;
                player.loop = this.loop;
                player.volume = this.volume;
                if (this.#width * this.#height > 0) {
                    player.resize(this.#width, this.#height);
                }
                player.appendTo(this.element);
                this.players.push(player);
            });
    }

    unregisterPlayers(players: readonly Player<S>[]): void {
        const playersToRemove = players.filter((player) => this.players.includes(player));
        const [removed, remaining] = partition(this.players, (player) =>
            playersToRemove.includes(player)
        );
        removed.forEach((player) => player.stop());
        this.players.length = 0;
        this.players.push(...remaining);
    }

    private get currentPlayer(): Player<S> | null {
        return this.player$.getValue();
    }

    private get loadError(): Error | null {
        return this.#loadError;
    }

    private set loadError(error: Error | null) {
        this.#loadError = error;
        if (error) {
            this.error$.next(error);
        }
    }

    private observeCurrentPlayer(): Observable<Player<S> | null> {
        return this.player$.pipe(distinctUntilChanged());
    }
}

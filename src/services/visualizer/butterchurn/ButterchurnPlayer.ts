import type {Observable} from 'rxjs';
import {Subject} from 'rxjs';
import butterchurn from 'butterchurn';
import {ButterchurnVisualizer} from 'types/Visualizer';
import AbstractVisualizerPlayer from 'services/players/AbstractVisualizerPlayer';
import {Logger} from 'utils';

const logger = new Logger('ButterchurnPlayer');

export default class ButterchurnPlayer extends AbstractVisualizerPlayer<ButterchurnVisualizer> {
    private readonly canvas = document.createElement('canvas');
    private readonly context2D = this.canvas.getContext('2d')!;
    private readonly visualizer: butterchurn.Visualizer;
    private readonly error$ = new Subject<unknown>();
    private animationFrameId = 0;
    private currentVisualizer = '';

    constructor(private readonly analyser: AnalyserNode) {
        super();

        this.canvas.hidden = true;
        this.canvas.className = `visualizer visualizer-butterchurn`;

        const visualizer = (this.visualizer = butterchurn.createVisualizer(
            analyser.context,
            this.canvas,
            {width: 400, height: 200}
        ));

        visualizer.connectAudio(analyser);
    }

    get hidden(): boolean {
        return this.canvas.hidden;
    }

    set hidden(hidden: boolean) {
        if (this.canvas.hidden !== hidden) {
            this.canvas.hidden = hidden;
            if (hidden) {
                this.visualizer.disconnectAudio(this.analyser);
            } else {
                this.visualizer.connectAudio(this.analyser);
                if (!this.animationFrameId) {
                    this.render();
                }
            }
        }
    }

    observeError(): Observable<unknown> {
        return this.error$;
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.append(this.canvas);
    }

    load(visualizer: ButterchurnVisualizer): void {
        if (visualizer) {
            logger.log('load', visualizer.name);
            if (this.currentVisualizer !== visualizer.name) {
                this.currentVisualizer = visualizer.name;
                this.cancelAnimation();
                this.visualizer.loadPreset(visualizer.data, 0.5);
                this.render();
            }
        }
    }

    play(): void {
        logger.log('play');
        if (!this.animationFrameId) {
            this.render();
        }
    }

    pause(): void {
        logger.log('pause');
        this.cancelAnimation();
    }

    stop(): void {
        logger.log('stop');
        this.cancelAnimation();
        this.clear();
    }

    resize(width: number, height: number): void {
        this.canvas.width = width;
        this.canvas.height = height;
        this.visualizer.render(); // Need to render at least once before we resize
        this.visualizer.setRendererSize(width, height);
        this.visualizer.render();
    }

    private clear(): void {
        const width = this.canvas.width;
        const height = this.canvas.height;
        this.context2D.clearRect(0, 0, width, height);
    }

    private render(): void {
        // try/catch on first render only
        if (!this.animationFrameId) {
            try {
                this.visualizer.render();
            } catch (err) {
                logger.error(err);
                this.error$.next(err);
            }
        } else {
            this.visualizer.render();
        }
        if (this.autoplay && !this.canvas.hidden) {
            this.animationFrameId = requestAnimationFrame(() => this.render());
        }
    }

    private cancelAnimation(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = 0;
        }
    }
}

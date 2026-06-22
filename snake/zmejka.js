"use strict";
const html = (() => {
    const dpadButtons = document.querySelectorAll("#dpad .dpad-btn");
    const dpadButtonsMap = Object.fromEntries(Array.from(dpadButtons).map((elem) => [elem.dataset.direction, elem]));
    return {
        board: document.getElementById("game-board"),
        deathScreen: document.getElementById("death-screen"),
        victoryScreen: document.getElementById("victory-screen"),
        score: document.getElementById("score"),
        playButton: document.getElementById("play"),
        pauseButton: document.getElementById("pause"),
        restartButton: document.getElementById("restart"),
        dpadButtons: dpadButtonsMap,
    };
})();
const deathAudio = new Audio("https://www.myinstants.com/media/sounds/dark-souls-you-died-sound-effect_hm5sYFG.mp3");
const victoryAudio = new Audio("https://www.myinstants.com/media/sounds/bossout.mp3");
deathAudio.volume = 0.6;
victoryAudio.volume = 0.6;
function getRandomInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function isOneOf(value, ...arr) {
    return arr.includes(value);
}
class Vec2 {
    x;
    y;
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    copy() {
        return new Vec2(this.x, this.y);
    }
    intersects(vec) {
        return this.x === vec.x && this.y === vec.y;
    }
    toString() {
        return `${this.x},${this.y}`;
    }
    static fromString(string) {
        const [x, y] = string.split(",", 2).map((a) => Number.parseInt(a));
        return new Vec2(x, y);
    }
}
class BoardElement {
    el = document.createElement("div");
    #pos = new Vec2(0, 0);
    get pos() {
        return this.#pos.copy();
    }
    constructor() {
        this.mount();
    }
    setPos(xOrPos, y) {
        let pos;
        if (xOrPos instanceof Vec2) {
            pos = xOrPos;
        }
        else {
            pos = new Vec2(xOrPos, y);
        }
        this.el.style.gridColumn = String(pos.x + 6);
        this.el.style.gridRow = String(pos.y + 6);
        this.#pos = pos;
        return this;
    }
    mount() {
        if (!this.el.parentNode) {
            html.board.append(this.el);
        }
        return this;
    }
    remove() {
        this.el.remove();
        return this;
    }
}
class SnakePart extends BoardElement {
    constructor() {
        super();
        this.el.className = "snake-part";
    }
    isEaten() {
        this.el.classList.add("eaten");
        return this;
    }
}
class SnakeHead extends SnakePart {
    #direction = "right";
    #prevDirection = this.direction;
    get direction() {
        return this.#direction;
    }
    constructor() {
        super();
        this.el.className = `snake-head ${this.direction}`;
    }
    setDirection(direction) {
        this.el.classList.replace(this.#direction, direction);
        this.#direction = direction;
        return this;
    }
    moveForward({ hasBody }) {
        const opposite = {
            up: "down",
            down: "up",
            right: "left",
            left: "right",
        };
        if (hasBody && this.#direction === opposite[this.#prevDirection]) {
            this.setDirection(this.#prevDirection);
        }
        const { pos } = this;
        switch (this.direction) {
            case "up":
                this.setPos(pos.x, pos.y - 1);
                break;
            case "down":
                this.setPos(pos.x, pos.y + 1);
                break;
            case "right":
                this.setPos(pos.x + 1, pos.y);
                break;
            case "left":
                this.setPos(pos.x - 1, pos.y);
                break;
        }
        this.#prevDirection = this.direction;
    }
}
class Food extends BoardElement {
    constructor() {
        super();
        this.el.className = "food";
    }
    randomPos(allowedPos) {
        const i = getRandomInteger(0, allowedPos.length - 1);
        const pos = Vec2.fromString(allowedPos[i]);
        this.setPos(pos);
        return this;
    }
}
class Game {
    state;
    head;
    parts = [];
    foods = [];
    loopTimeout;
    score;
    loopTimeoutId = 0;
    allPositions = new Set();
    constructor() {
        this.computeAllBoardPositions();
        this.initState();
        this.setupListeners();
        this.scheduleLoop();
    }
    computeAllBoardPositions() {
        for (let x = -5; x <= 5; x++) {
            for (let y = -5; y <= 5; y++) {
                this.allPositions.add(new Vec2(x, y).toString());
            }
        }
    }
    initState() {
        clearTimeout(this.loopTimeoutId);
        html.deathScreen.classList.replace("active", "hidden");
        html.victoryScreen.classList.replace("active", "hidden");
        deathAudio.pause();
        victoryAudio.pause();
        deathAudio.fastSeek(0);
        victoryAudio.fastSeek(0);
        for (const part of this.parts)
            part.remove();
        for (const food of this.foods)
            food.remove();
        this.setState("paused");
        this.head = new SnakeHead().setPos(0, 0).setDirection("right");
        this.parts = [this.head];
        this.foods = [new Food().setPos(3, 0)];
        this.score = 0;
        html.score.innerText = String(this.score);
        this.updateGameSpeed();
    }
    setupListeners() {
        document.addEventListener("keydown", (event) => {
            switch (event.code) {
                case "ArrowUp":
                case "ArrowDown":
                case "ArrowRight":
                case "ArrowLeft": {
                    const direction = {
                        ArrowUp: "up",
                        ArrowDown: "down",
                        ArrowRight: "right",
                        ArrowLeft: "left",
                    }[event.code];
                    this.inputDirection(direction);
                    this.setButtonActive(html.dpadButtons[direction], true);
                    break;
                }
                case "Space": {
                    const buttonElement = {
                        paused: html.pauseButton,
                        playing: html.playButton,
                        dead: null,
                        victory: null,
                    }[this.state];
                    if (buttonElement)
                        this.setButtonActive(buttonElement, true);
                    this.setState({
                        paused: "playing",
                        playing: "paused",
                        dead: "dead",
                        victory: "victory",
                    }[this.state]);
                    break;
                }
                case "KeyR":
                    if (this.state !== "dead" && this.state !== "victory")
                        break;
                    this.initState();
                    this.setButtonActive(html.restartButton, true);
                    break;
            }
        });
        document.addEventListener("keyup", (event) => {
            switch (event.code) {
                case "ArrowUp":
                case "ArrowDown":
                case "ArrowRight":
                case "ArrowLeft": {
                    const direction = {
                        ArrowUp: "up",
                        ArrowDown: "down",
                        ArrowRight: "right",
                        ArrowLeft: "left",
                    }[event.code];
                    this.setButtonActive(html.dpadButtons[direction], false);
                    break;
                }
                case "Space": {
                    const buttonElement = {
                        paused: html.playButton,
                        playing: html.pauseButton,
                        dead: null,
                        victory: null,
                    }[this.state];
                    if (buttonElement)
                        this.setButtonActive(buttonElement, false);
                    break;
                }
                case "KeyR":
                    this.setButtonActive(html.restartButton, false);
                    break;
            }
        });
        html.playButton.addEventListener("click", () => {
            this.setState("playing");
        });
        html.pauseButton.addEventListener("click", () => {
            this.setState("paused");
        });
        html.restartButton.addEventListener("click", () => {
            this.initState();
        });
        for (const [direction, dpadButton] of Object.entries(html.dpadButtons)) {
            // We don't need to highlight manually button here - browser does it for us
            dpadButton.addEventListener("mousedown", () => {
                this.inputDirection(direction);
            });
        }
    }
    inputDirection(direction) {
        if (this.state === "paused") {
            this.setState("playing");
        }
        if (this.state !== "playing")
            return;
        clearTimeout(this.loopTimeoutId);
        this.head.setDirection(direction);
        this.loop();
        this.scheduleLoop();
    }
    setButtonActive(button, active) {
        button.classList.toggle("active", active);
    }
    setState(state) {
        this.state = state;
        switch (this.state) {
            case "paused":
                html.playButton.classList.remove("hidden");
                html.pauseButton.classList.add("hidden");
                html.restartButton.classList.add("hidden");
                break;
            case "playing":
                html.playButton.classList.add("hidden");
                html.pauseButton.classList.remove("hidden");
                html.restartButton.classList.add("hidden");
                break;
            case "dead":
            case "victory":
                html.playButton.classList.add("hidden");
                html.pauseButton.classList.add("hidden");
                html.restartButton.classList.remove("hidden");
                break;
        }
    }
    scheduleLoop() {
        this.loopTimeoutId = setTimeout(() => {
            clearTimeout(this.loopTimeoutId);
            this.loop();
            this.scheduleLoop();
        }, this.loopTimeout);
    }
    loop() {
        if (this.state !== "playing")
            return;
        const lastPartPrevPos = this.moveSnakeForward();
        this.eatSelf();
        this.eatFood(lastPartPrevPos);
        this.outOfBounds();
    }
    moveSnakeForward() {
        const reversedParts = this.parts.toReversed();
        const lastPartPrevPos = reversedParts[0].pos;
        for (const [i, part] of reversedParts.entries()) {
            const nextPart = reversedParts.at(i + 1);
            if (!nextPart)
                break;
            part.setPos(nextPart.pos);
        }
        this.head.moveForward({ hasBody: this.parts.length > 1 });
        return lastPartPrevPos;
    }
    eatSelf() {
        const consumedPart = this.parts
            .slice(1)
            .find((part) => part.pos.intersects(this.head.pos));
        if (!consumedPart)
            return;
        consumedPart.isEaten();
        this.gameOver();
    }
    eatFood(lastPartPrevPos) {
        const consumedFood = this.foods.find((food) => food.pos.intersects(this.head.pos));
        if (!consumedFood)
            return;
        consumedFood.remove();
        this.foods = this.foods.filter((food) => food !== consumedFood);
        this.parts.push(new SnakePart().setPos(lastPartPrevPos));
        this.score += 1;
        html.score.innerText = String(this.score);
        const allowedPositions = this.getAllowedPositionsForFood();
        if (!allowedPositions.length) {
            this.victory();
            return;
        }
        this.foods.push(new Food().randomPos(allowedPositions));
        this.updateGameSpeed();
    }
    updateGameSpeed() {
        const size = this.parts.length;
        if (size > 50) {
            this.loopTimeout = 200;
        }
        else if (size > 20) {
            this.loopTimeout = 400;
        }
        else if (size > 15) {
            this.loopTimeout = 500;
        }
        else if (size > 5) {
            this.loopTimeout = 700;
        }
        else {
            this.loopTimeout = 800;
        }
    }
    getAllowedPositionsForFood() {
        const partsPosSet = new Set(this.parts.map((part) => part.pos.toString()));
        return Array.from(this.allPositions.difference(partsPosSet));
    }
    outOfBounds() {
        const { pos } = this.head;
        if (pos.x <= 5 && pos.x >= -5 && pos.y <= 5 && pos.y >= -5)
            return;
        this.gameOver();
    }
    gameOver() {
        this.setState("dead");
        html.deathScreen.classList.remove("hidden");
        // Force a reflow/repaint so CSS notices
        void html.deathScreen.offsetWidth;
        html.deathScreen.classList.add("active");
        deathAudio.play();
    }
    victory() {
        this.setState("victory");
        html.victoryScreen.classList.remove("hidden");
        // Force a reflow/repaint so CSS notices
        void html.victoryScreen.offsetWidth;
        html.victoryScreen.classList.add("active");
        victoryAudio.play();
    }
}
new Game();

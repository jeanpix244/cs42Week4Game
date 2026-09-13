import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from '../common/scene-keys.js';
import { ASSET_KEYS } from '../common/assets.js';

// How much the score increases each time a falling object is caught.
// (Task 1: change this single value to tune scoring.)
const SCORE_PER_CATCH = 15;

const PLAYER_SPEED = 480;
const MAX_MISSES = 5;
const SPAWN_DELAY = 900;

/**
 * @typedef CraftItem
 * @type {object}
 * @property {string} frame
 * @property {number} radius
 */

/** @type {CraftItem[]} */
const CRAFT_ITEMS = [
  { frame: 'button1.png', radius: 26 },
  { frame: 'button2.png', radius: 26 },
  { frame: 'button3.png', radius: 26 },
  { frame: 'button4.png', radius: 26 },
  { frame: 'button5.png', radius: 26 },
  { frame: 'needle_pin1.png', radius: 20 },
  { frame: 'needle_pin2.png', radius: 20 },
  { frame: 'needle_pin3.png', radius: 20 },
  { frame: 'needle_pin4.png', radius: 20 },
  { frame: 'needle_pin5.png', radius: 20 },
  { frame: 'thread1.png', radius: 24 },
  { frame: 'thread2.png', radius: 24 },
  { frame: 'thread3.png', radius: 24 },
];

export class GameScene extends Phaser.Scene {
  constructor() {
    super({
      key: SCENE_KEYS.GAME_SCENE,
    });

    /** @type {Phaser.Physics.Arcade.Sprite} */
    this.player = null;
    /** @type {Phaser.Physics.Arcade.Group} */
    this.fallingItems = null;
    /** @type {Phaser.Time.TimerEvent} */
    this.spawnTimer = null;
    /** @type {Phaser.Types.Input.Keyboard.CursorKeys} */
    this.cursors = null;

    this.score = 0;
    this.misses = 0;
    this.isGameOver = false;

    /** @type {Phaser.GameObjects.Text} */
    this.scoreText = null;
    /** @type {Phaser.GameObjects.Text} */
    this.missesText = null;
  }

  /**
   * @public
   * Tied to the Phaser Scene lifecycle. Will run one time after the PRELOAD
   * logic is finished. Runs each time the Phaser Scene restarts.
   * @returns {void}
   */
  create() {
    this.score = 0;
    this.misses = 0;
    this.isGameOver = false;

    // add game background
    this.add.image(this.scale.width / 2, this.scale.height / 2, ASSET_KEYS.BACKGROUND);

    // add player controlled basket
    this.player = this.physics.add.sprite(
      this.scale.width / 2,
      this.scale.height - 90,
      ASSET_KEYS.JAR,
    );
    this.player.setCollideWorldBounds(true);
    this.player.body.setAllowGravity(false);

    // keyboard input
    this.cursors = this.input.keyboard.createCursorKeys();

    // group that will hold all currently falling craft items
    this.fallingItems = this.physics.add.group();

    // score + miss counter UI
    this.scoreText = this.add.text(24, 24, `Score: ${this.score}`, {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.missesText = this.add.text(24, 64, `Misses: ${this.misses} / ${MAX_MISSES}`, {
      fontSize: '24px',
      color: '#ffe3c2',
    });

    // catch detection between the basket and falling items
    this.physics.add.overlap(this.player, this.fallingItems, this.handleCatch, undefined, this);

    // repeatedly spawn new falling items on a timer
    this.spawnTimer = this.time.addEvent({
      delay: SPAWN_DELAY,
      loop: true,
      callback: () => this.launchCraftItem(),
    });
  }

  /**
   * @public
   * Tied to the Phaser Scene lifecycle. Runs once per frame.
   * @returns {void}
   */
  update() {
    if (this.isGameOver) {
      return;
    }

    this.handlePlayerMovement();
    this.cleanUpMissedItems();
  }

  /**
   * @private
   * Reads keyboard input and moves the player left/right.
   * @returns {void}
   */
  handlePlayerMovement() {
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-PLAYER_SPEED);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(PLAYER_SPEED);
    } else {
      this.player.setVelocityX(0);
    }
  }

  /**
   * @private
   * Spawns a single falling craft item at a random x position along the top
   * of the screen with a random craft item texture frame.
   * (Renamed from the original `spawnFallingObject()`.)
   * @returns {void}
   */
  launchCraftItem() {
    if (this.isGameOver) {
      return;
    }

    const itemConfig = Phaser.Utils.Array.GetRandom(CRAFT_ITEMS);
    const x = Phaser.Math.Between(60, this.scale.width - 60);

    /** @type {Phaser.Physics.Arcade.Sprite} */
    const item = this.fallingItems.create(x, -40, ASSET_KEYS.OBJECTS, itemConfig.frame);
    item.body.setCircle(itemConfig.radius);
    item.setVelocityY(Phaser.Math.Between(180, 320));
  }

  /**
   * @private
   * Called whenever the player overlaps a falling craft item.
   * Removes the item and increases the score.
   * @param {Phaser.Physics.Arcade.Sprite} player
   * @param {Phaser.Physics.Arcade.Sprite} item
   * @returns {void}
   */
  handleCatch(player, item) {
    item.destroy();

    this.score += SCORE_PER_CATCH;
    this.scoreText.setText(`Score: ${this.score}`);
  }

  /**
   * @private
   * Checks for any falling items that have gone past the bottom of the
   * screen without being caught, removes them, and counts them as a miss.
   * @returns {void}
   */
  cleanUpMissedItems() {
    this.fallingItems.getChildren().forEach((item) => {
      if (item.y > this.scale.height + 40) {
        item.destroy();
        this.registerMiss();
      }
    });
  }

  /**
   * @private
   * Increments the miss counter and triggers game over once the max
   * number of misses has been reached.
   * @returns {void}
   */
  registerMiss() {
    if (this.isGameOver) {
      return;
    }

    this.misses += 1;
    this.missesText.setText(`Misses: ${this.misses} / ${MAX_MISSES}`);

    if (this.misses >= MAX_MISSES) {
      this.concludeGame();
    }
  }

  /**
   * @private
   * Ends the current game: stops spawning/physics, shows the game over
   * message with the final score, and listens for input to restart.
   * (Renamed from the original `handleGameOver()`.)
   * @returns {void}
   */
  concludeGame() {
    this.isGameOver = true;

    this.spawnTimer.remove();
    this.physics.pause();
    this.player.setTint(0xff6b6b);

    this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2,
        `Game Over!\nFinal Score: ${this.score}\n\nClick or press SPACE to play again`,
        {
          fontSize: '40px',
          color: '#ffffff',
          align: 'center',
          fontStyle: 'bold',
        },
      )
      .setOrigin(0.5)
      .setLineSpacing(12);

    this.input.keyboard.once('keydown-SPACE', () => this.scene.restart());
    this.input.once('pointerdown', () => this.scene.restart());
  }
}

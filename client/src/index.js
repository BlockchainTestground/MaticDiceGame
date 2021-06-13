import Phaser from "phaser";
import dragonBones from "./external/dragonBones";
import { roll, disconnectWallet, getPlayerRequestId, getContractBalance, getLinkBalance, getGame, convertWeiToCrypto, convertCryptoToWei, getBalance } from "./blockchain/contract_interaction";
import logoImg from "./assets/logo.png";
import animationTrigger from './AnimationTriggers';
const Result = {
  Pending: 0,
  PlayerWon: 1,
  PlayerLost: 2
}

const config = {
  type: Phaser.AUTO,
  parent: "phaser_canvas",
  width: 600,
  height: 600,
  dom: {
    createContainer: true
  },
  plugins: {
    scene: [
      { key: "DragonBones", plugin: dragonBones.phaser.plugin.DragonBonesScenePlugin, mapping: "dragonbone" } // setup DB plugin
    ]
  },
  transparent: true,
  scene: {
    preload: preload,
    create: create
  }
};

const game = new Phaser.Game(config);
var ui_text
var current_request_id = null
var current_amount = "0.1"
var amount_form_html
var arm
var arm2
var steam_emitter

function preload() {
  this.load.image('steam', './src/assets/steam.png')

  this.load.dragonbone(
      animationTrigger.throne.name,
      "src/assets/DragonBonesFiles/Throne/Throne_tex.png",
      "src/assets/DragonBonesFiles/Throne/Throne_tex.json",
      "src/assets/DragonBonesFiles/Throne/Throne_ske.json",
  );

  this.load.dragonbone(
    animationTrigger.toaster.name,
    "src/assets/DragonBonesFiles/OracleToaster/Toaster_tex.png",
    "src/assets/DragonBonesFiles/OracleToaster/Toaster_tex.json",
    "src/assets/DragonBonesFiles/OracleToaster/Toaster_ske.json",
);
}

function create() {
  arm2 = this.add.armature("Armature", animationTrigger.throne.name);
  arm2.x = 400;
  arm2.y = 300;
  arm2.animation.play(animationTrigger.throne.animations.throne_idle);

  arm = this.add.armature("Armature", animationTrigger.toaster.name);
  console.log(dragonBones.EventObject)
  arm.addDBEventListener(dragonBones.EventObject.LOOP_COMPLETE, animationLoopCompleteCallback, this);
  arm.x = 400;
  arm.y = 375;
  arm.animation.play(animationTrigger.toaster.animations.idle);

  ui_text = this.add.text(0, 50, '', { fontFamily: 'Georgia, "Goudy Bookletter 1911", Times, serif' });


  var steam_particles = this.add.particles('steam');
  steam_emitter = steam_particles.createEmitter({
      x: 400,
      y: 300,
      speed: 200,
      scaleX: 0.5,
      scaleY: 1,
      gravityY: -200
  });
  steam_emitter.stop()
}

function animationLoopCompleteCallback(event)
{
  switch(event.animationState.name) {
    case animationTrigger.toaster.animations.tx_init:
      arm.animation.play(animationTrigger.toaster.animations.tx_loop);
      break;
    case animationTrigger.toaster.animations.oracle_init:
      arm.animation.play(animationTrigger.toaster.animations.oracle_loop);
      steam_emitter.start(false, 5000, 100)
      break;
    case animationTrigger.toaster.animations.eject_normal_toast:
      arm.animation.play(animationTrigger.toaster.animations.discard_normal);
      break;
    case animationTrigger.toaster.animations.eject_burn_toast:
      arm.animation.play(animationTrigger.toaster.animations.discard_burn);
      break;
    case animationTrigger.toaster.animations.discard_burn:
      arm.animation.play(animationTrigger.toaster.animations.idle);
      break;
    case animationTrigger.toaster.animations.discard_normal:
      arm.animation.play(animationTrigger.toaster.animations.idle);
      break;
  }
}

function onRoll(selection)
{
  ui_text.text = "Waiting confirmation"
  arm.animation.play(animationTrigger.toaster.animations.tx_init);
  roll("123", selection, current_amount, () => {
    ui_text.text = "Waiting oracle"
    arm.animation.play(animationTrigger.toaster.animations.oracle_init);
    getPlayerRequestId((request_id) => {
      current_request_id = request_id
      console.log(current_request_id)
    });
  });
}

function poll() {
  console.log("polling...")
  if(current_request_id)
  {
    getGame(current_request_id, (game) => {
      if(game.result == Result.Pending)
        console.log("Pending...")
      else
      {
        current_request_id = null
        steam_emitter.stop()
        if((game.selection == 0 && game.result == Result.PlayerWon)
          || (game.selection == 1 && game.result == Result.PlayerLost))
        {
          arm.animation.play(animationTrigger.toaster.animations.eject_normal_toast);
        }else
        {
          arm.animation.play(animationTrigger.toaster.animations.eject_burn_toast);
        }
        if(game.result == Result.PlayerWon)
        {
          console.log("Player won")
          ui_text.text = "Player won"
        }
        if(game.result == Result.PlayerLost)
        {
          console.log("Player lost")
          ui_text.text = "Player lost"
        }
      }
    });
  }

  getBalance((balance) => {
    document.getElementById('my-balance').innerHTML = convertWeiToCrypto(balance) + " Matic"
  });
  /*
  getContractBalance((balance) => {
    console.log("Contract balance: " + balance)
  });

  getLinkBalance((balance) => {
    console.log("Link balance: " + balance)
  });
  */
}

var display_click_count_poller = setInterval(poll,500)

function _disconnectWallet() {
  disconnectWallet()
}

function onAClicked() {
  onRoll("0")
}

function onBClicked() {
  onRoll("1")
}

function onBetAmountUpdate() {
  current_amount = document.getElementById('bet_amount').value
}

window._disconnectWallet = _disconnectWallet;
window.onAClicked = onAClicked;
window.onBClicked = onBClicked;
window.onBetAmountUpdate = onBetAmountUpdate;
<script lang="ts">
    import Phaser from "phaser";
    import { onMount } from "svelte";
    import Game from "./client/Game";

    let gameEl: HTMLDivElement;
    let clientWidth = $state(0);
    let clientHeight = $state(0);
    let game: Phaser.Game | null = $state(null);
    let downScale = 1;

    $effect(() => {
        if (game) {
            // on resize end

            game.scale.setGameSize(
                clientWidth / downScale,
                clientHeight / downScale
            );
        }
    });

    onMount(() => {
        game = new Phaser.Game({
            scene: Game,
            type: Phaser.AUTO,
            parent: gameEl,
            width: clientWidth / downScale,
            height: clientHeight / downScale,
            // Fill
            scale: {
                mode: Phaser.Scale.FIT,
            },
            antialias: false,
            // pixelArt: true,
        });
        game.registry.destroy(); // destroy registry
    });
</script>

<div class="game" bind:this={gameEl} bind:clientWidth bind:clientHeight></div>

<style>
    .game {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        overflow: hidden;
    }
</style>

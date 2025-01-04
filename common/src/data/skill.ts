import { addProps, baseEntityMixin } from "./entity";

function baseSkillBlueprint() {
    const obj = baseEntityMixin();
    obj.name = "Skill";
    obj.description = "Pretty much a waste of time";

    const with_new_props = addProps(obj, {
        is_skill: true,
        unlock_cost: 999,
    });

    return with_new_props;
}

function basicForagingBlueprint() {
    const obj = baseSkillBlueprint();
    obj.name = "Basic Foraging";
    obj.description = "You can find food in the wild.";
    obj.unlock_cost = 1;

    return obj;
}

function sonarPingBlueprint() {
    const obj = baseSkillBlueprint();
    obj.name = "Sonar Ping";
    obj.description = "Reveals nearby objects and creatures.";
    obj.unlock_cost = 1;

    return obj;
}

function steadyHandsBlueprint() {
    const obj = baseSkillBlueprint();
    obj.name = "Steady Hands";
    obj.description = "Makes the fishing minigame easier";
    obj.unlock_cost = 1;
    return obj;
}

export const SkillEntries = [
    basicForagingBlueprint(),
    sonarPingBlueprint(),
    steadyHandsBlueprint(),
];

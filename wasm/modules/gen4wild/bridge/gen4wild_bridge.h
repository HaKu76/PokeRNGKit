#ifndef POKERNGKIT_WILD4_BRIDGE_H
#define POKERNGKIT_WILD4_BRIDGE_H

#include <cstdint>

struct Gen4WildPackedSlot {
    std::uint32_t species;
    std::uint32_t form;
    std::uint32_t minLevel;
    std::uint32_t maxLevel;
    std::uint32_t stats[6];
    std::uint32_t types[2];
    std::uint32_t genderRatio;
    std::uint32_t items[3];
    std::uint32_t abilities[3];
};

struct Gen4WildPackedState {
    std::uint32_t advances;
    std::uint32_t battleAdvances;
    std::uint32_t pid;
    std::uint32_t ivs[6];
    std::uint32_t ability;
    std::uint32_t gender;
    std::uint32_t level;
    std::uint32_t nature;
    std::uint32_t shiny;
    std::uint32_t encounterSlot;
    std::uint32_t species;
    std::uint32_t form;
    std::uint32_t item;
    std::uint32_t hiddenPower;
    std::uint32_t hiddenPowerStrength;
    std::uint32_t call;
    std::uint32_t chatot;
};

struct Gen4WildPackedSearcherState {
    std::uint32_t seed;
    std::uint32_t delay;
    std::uint32_t hour;
    std::uint32_t advances;
    std::uint32_t pid;
    std::uint32_t ivs[6];
    std::uint32_t ability;
    std::uint32_t gender;
    std::uint32_t level;
    std::uint32_t nature;
    std::uint32_t shiny;
    std::uint32_t encounterSlot;
    std::uint32_t species;
    std::uint32_t form;
    std::uint32_t item;
    std::uint32_t hiddenPower;
    std::uint32_t hiddenPowerStrength;
};

struct Gen4WildPackedRequest {
    const Gen4WildPackedSlot *slots;
    std::uint32_t slotCount;
    std::uint32_t seed;
    std::uint32_t initialAdvances;
    std::uint32_t maxAdvances;
    std::uint32_t offset;
    std::uint32_t method;
    std::uint32_t lead;
    std::uint32_t encounter;
    std::uint32_t rate;
    std::uint32_t location;
    std::uint32_t tid;
    std::uint32_t sid;
    std::uint32_t game;
    std::uint32_t minAdvance;
    std::uint32_t maxAdvance;
    std::uint32_t minDelay;
    std::uint32_t maxDelay;
    std::uint32_t feebasTile;
    std::uint32_t safariBlock;
    std::uint32_t happiness;
    std::uint32_t fixedSlot;
    std::uint32_t radarShiny;
    std::uint32_t unownRadio;
    std::uint32_t nationalDex;
    std::uint32_t shinyFilter;
    std::uint32_t genderFilter;
    std::uint32_t abilityFilter;
    std::uint32_t natureMask;
    std::uint32_t hiddenPowerMask;
    std::uint32_t encounterSlotMask;
    std::uint32_t levelMin;
    std::uint32_t levelMax;
    std::uint32_t ivMin[6];
    std::uint32_t ivMax[6];
    std::uint32_t unownDiscovered[26];
    std::uint32_t unownPuzzle[4];
};

extern "C" {
std::uint32_t gen4wild_api_version();
std::uint32_t gen4wild_generate(const Gen4WildPackedRequest *request);
std::uint32_t gen4wild_search(const Gen4WildPackedRequest *request, std::uint32_t startIndex, std::uint32_t stateCount);
std::uintptr_t gen4wild_result_ptr();
std::uint32_t gen4wild_result_count();
std::uint32_t gen4wild_last_error();
}

#endif

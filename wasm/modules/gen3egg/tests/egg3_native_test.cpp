/*
 * PokeRNGKit Gen III Egg native parity tests.
 * Copyright (C) 2017-2024 by Admiral_Fish, bumba, and EzPzStreamz
 * Copyright (C) 2026 Hakuhiro
 *
 * Fixed fixtures are from PokeFinder 4.3.2 Test/Gen3/egg3.json.
 * This program is free software under GNU GPL-3.0-or-later.
 */

#include "gen3egg_bridge.h"

#include <array>
#include <cassert>
#include <cstdint>

namespace
{
    constexpr std::uint32_t natureMask = 0x1ff'ffff;
    constexpr std::uint32_t hiddenPowerMask = 0xffff;

    std::array<std::uint32_t, 56> createRequest(bool emerald, std::uint32_t method)
    {
        std::array<std::uint32_t, 56> request {};
        request[0] = emerald ? 0 : 1;
        request[1] = method;
        request[10] = emerald ? 18 : 0;
        request[13] = 70;
        request[14] = 1;
        request[15] = 31;
        request[16] = 31;
        request[17] = 12345;
        request[18] = 54321;
        request[8] = 9;
        request[22] = natureMask;
        request[23] = hiddenPowerMask;
        for (std::size_t index = 0; index < 6; index++)
        {
            request[30 + index] = 31;
            request[36 + index] = 31;
            request[42 + index] = 31;
        }
        request[48] = 0;
        request[49] = 1;
        request[50] = 0;
        request[51] = emerald ? 1 : 0;
        request[54] = 31;
        request[55] = 0;
        return request;
    }

    void testEmeraldNormal()
    {
        auto request = createRequest(true, 0); // EBred
        const auto count = gen3egg_generate(request.data(), static_cast<std::uint32_t>(request.size()), 0, 9, 1000);
        assert(gen3egg_last_error() == 0);
        assert(count == 50);
        assert(gen3egg_result_count() == count);
        const auto *states = reinterpret_cast<const Gen3EggPackedState *>(gen3egg_result_ptr());
        const auto &state = states[0];
        assert(state.advances == 4294967278u);
        assert(state.pickupAdvances == 0);
        assert(state.redraws == 0);
        assert(state.pid == 4030878322u);
        assert(state.ability == 0);
        assert(state.gender == 0);
        assert(state.nature == 22);
        assert(state.shiny == 0);
        assert(state.hp == 31 && state.attack == 31 && state.defense == 0);
        assert(state.specialAttack == 31 && state.specialDefense == 26 && state.speed == 30);
        assert(state.inheritanceHp == 2 && state.inheritanceAttack == 2 && state.inheritanceDefense == 0);
        assert(state.inheritanceSpecialAttack == 2 && state.inheritanceSpecialDefense == 0 && state.inheritanceSpeed == 0);
        assert(state.hiddenPower == 4 && state.hiddenPowerStrength == 67);
    }

    void testRsFrlgSplit()
    {
        auto request = createRequest(false, 4); // RSFRLGBredSplit
        const auto count = gen3egg_generate(request.data(), static_cast<std::uint32_t>(request.size()), 0, 9, 1000);
        assert(gen3egg_last_error() == 0);
        assert(count == 60);
        assert(gen3egg_result_count() == count);
        const auto *states = reinterpret_cast<const Gen3EggPackedState *>(gen3egg_result_ptr());
        const auto &state = states[0];
        assert(state.advances == 0);
        assert(state.pickupAdvances == 0);
        assert(state.redraws == 0);
        assert(state.pid == 59775);
        assert(state.ability == 1);
        assert(state.gender == 0);
        assert(state.nature == 0);
        assert(state.shiny == 0);
        assert(state.hp == 30 && state.attack == 11 && state.defense == 31);
        assert(state.specialAttack == 31 && state.specialDefense == 31 && state.speed == 16);
        assert(state.inheritanceHp == 0 && state.inheritanceAttack == 0 && state.inheritanceDefense == 1);
        assert(state.inheritanceSpecialAttack == 2 && state.inheritanceSpecialDefense == 1 && state.inheritanceSpeed == 0);
        assert(state.hiddenPower == 12 && state.hiddenPowerStrength == 64);
    }
}

int main()
{
    static_assert(sizeof(Gen3EggPackedState) == 88);
    assert(gen3egg_api_version() == 2);
    testEmeraldNormal();
    testRsFrlgSplit();
    return 0;
}

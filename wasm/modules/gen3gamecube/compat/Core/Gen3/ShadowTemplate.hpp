/*
 * PokeRNGKit resource adapter for PokeFinder GameCube RNG
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

#ifndef POKERNGKIT_GAMECUBE_SHADOW_TEMPLATE_HPP
#define POKERNGKIT_GAMECUBE_SHADOW_TEMPLATE_HPP

#include <Core/Enum/Game.hpp>
#include <Core/Enum/Shiny.hpp>
#include <Core/Enum/ShadowType.hpp>
#include <Core/Gen3/LockInfo.hpp>
#include <Core/Global.hpp>
#include <Core/Parents/PersonalInfo.hpp>
#include <array>

class ShadowTemplate
{
public:
    constexpr ShadowTemplate(Game version, u16 specie, Shiny shiny, u8 level,
                             const std::array<LockInfo, 5> &locks, s8 count, ShadowType type,
                             const PersonalInfo *info) :
        version(version), specie(specie), shiny(shiny), level(level), info(info), type(type), locks(locks), count(count)
    {
    }

    s8 getCount() const { return count; }
    const PersonalInfo *getInfo() const { return info; }
    u8 getLevel() const { return level; }
    LockInfo getLock(s8 index) const { return locks[index]; }
    Shiny getShiny() const { return shiny; }
    u16 getSpecie() const { return specie; }
    ShadowType getType() const { return type; }
    Game getVersion() const { return version; }

private:
    Game version;
    u16 specie;
    Shiny shiny;
    u8 level;
    const PersonalInfo *info;
    ShadowType type;
    std::array<LockInfo, 5> locks;
    s8 count;
};

#endif

/*
 * PokeRNGKit resource adapter for PokeFinder GameCube RNG
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

#ifndef POKERNGKIT_GAMECUBE_STATIC_TEMPLATE3_HPP
#define POKERNGKIT_GAMECUBE_STATIC_TEMPLATE3_HPP

#include <Core/Enum/Game.hpp>
#include <Core/Enum/Shiny.hpp>
#include <Core/Global.hpp>
#include <Core/Parents/PersonalInfo.hpp>

class StaticTemplate3
{
public:
    constexpr StaticTemplate3(Game version, u16 specie, Shiny shiny, u8 level, const PersonalInfo *info) :
        version(version), specie(specie), shiny(shiny), level(level), info(info)
    {
    }

    const PersonalInfo *getInfo() const { return info; }
    u8 getLevel() const { return level; }
    Shiny getShiny() const { return shiny; }
    u16 getSpecie() const { return specie; }
    Game getVersion() const { return version; }

private:
    Game version;
    u16 specie;
    Shiny shiny;
    u8 level;
    const PersonalInfo *info;
};

#endif

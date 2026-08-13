/*
 * PokeRNGKit filter adapter for PokeFinder GameCube RNG
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

#ifndef POKERNGKIT_GAMECUBE_STATE_FILTER_HPP
#define POKERNGKIT_GAMECUBE_STATE_FILTER_HPP

#include <Core/Global.hpp>
#include <Core/Parents/States/State.hpp>
#include <array>

class StateFilter
{
public:
    StateFilter(u8 gender, u8 ability, u8 shiny, u8, u8, u8, u8, u8, u8, bool skip,
                const std::array<u8, 6> &ivMin, const std::array<u8, 6> &ivMax,
                const std::array<bool, 25> &natures, const std::array<bool, 16> &powers) :
        skip(skip), natures(natures), powers(powers), ivMax(ivMax), ivMin(ivMin), ability(ability), gender(gender), shiny(shiny)
    {
    }

    bool compareAbility(u8 value) const { return skip || ability == 255 || ability == value; }
    bool compareGender(u8 value) const { return skip || gender == 255 || gender == value; }
    bool compareHiddenPower(u8 value) const { return skip || powers[value]; }
    bool compareNature(u8 value) const { return skip || natures[value]; }
    bool compareShiny(u8 value) const { return skip || shiny == 255 || (shiny & value) != 0; }
    bool compareIV(const std::array<u8, 6> &values) const
    {
        if (skip) return true;
        for (int index = 0; index < 6; index++)
        {
            if (values[index] < ivMin[index] || values[index] > ivMax[index]) return false;
        }
        return true;
    }
    bool compareState(const State &state) const
    {
        return compareAbility(state.getAbility()) && compareGender(state.getGender())
            && compareHiddenPower(state.getHiddenPower()) && compareNature(state.getNature())
            && compareShiny(state.getShiny()) && compareIV(state.getIVs());
    }
    bool compareState(const SearcherState &state) const
    {
        return compareAbility(state.getAbility()) && compareGender(state.getGender())
            && compareHiddenPower(state.getHiddenPower()) && compareShiny(state.getShiny());
    }

private:
    bool skip;
    std::array<bool, 25> natures;
    std::array<bool, 16> powers;
    std::array<u8, 6> ivMax;
    std::array<u8, 6> ivMin;
    u8 ability;
    u8 gender;
    u8 shiny;
};

#endif

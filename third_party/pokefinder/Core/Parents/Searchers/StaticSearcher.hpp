/*
 * This file is part of PokeFinder
 * Copyright (C) 2017-2024 by Admiral_Fish, bumba, and EzPzStreamz
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, either version 3
 * of the License, or (at your option) any later version.
 */

#ifndef STATICSEARCHER_HPP
#define STATICSEARCHER_HPP

#include <Core/Parents/Searchers/Searcher.hpp>

enum class Lead : u8;

template <class Profile, class Filter, class Result>
class StaticSearcher : public Searcher<Profile, Result>
{
public:
    StaticSearcher(Method method, Lead lead, const Profile &profile, const Filter &filter) :
        Searcher<Profile, Result>(method, profile), filter(filter), lead(lead)
    {
    }

protected:
    Filter filter;
    Lead lead;
};

#endif

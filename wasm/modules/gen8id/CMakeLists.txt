if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen8IdNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(GEN8ID_ROOT "${CMAKE_CURRENT_LIST_DIR}/../../..")
set(GEN8ID_POKEFINDER_ROOT "${GEN8ID_ROOT}/third_party/pokefinder")
set(GEN8ID_SOURCES
    bridge/gen8id_bridge.cpp
    upstream/Core/Gen8/Generators/IDGenerator8.cpp
    upstream/Core/RNG/Xorshift.cpp
    "${GEN8ID_POKEFINDER_ROOT}/Core/Parents/Filters/IDFilter.cpp"
)

if(EMSCRIPTEN)
    add_executable(gen8id ${GEN8ID_SOURCES})
    target_include_directories(gen8id PRIVATE bridge upstream "${GEN8ID_POKEFINDER_ROOT}")
    target_compile_options(gen8id PRIVATE "-O3")
    target_link_options(
        gen8id
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen8IdModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen8id_api_version','_gen8id_generate','_gen8id_result_ptr','_gen8id_result_count','_gen8id_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen8id
        PROPERTIES
        OUTPUT_NAME "gen8id"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen8id_native_test ${GEN8ID_SOURCES} tests/gen8id_native_test.cpp)
    target_include_directories(gen8id_native_test PRIVATE bridge upstream "${GEN8ID_POKEFINDER_ROOT}")
    add_test(NAME gen8id_native_parity COMMAND gen8id_native_test)
endif()

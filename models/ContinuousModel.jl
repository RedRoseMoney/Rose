using Distributions, Zygote, Plots

mutable struct Reserves{T}
    R₀::T
    R₁::T
    ω₁::T
    const R₁init::T
    const α::T
end

function Γ(R₀::T, R₁::T, x::T) where {T}
    K = R₀ * R₁
    R₀′ = R₀ + x
    R₁′ = K / R₀′
    y = R₁ - R₁′
    return R₀′, R₁′, y
end

function 𝑐𝑝(R₀::T, R₁::T, x::T) where T
    -x <= 0.9R₀ || return R₀, R₁, zero(T)
    R₀′, R₁′, y = Γ(R₀, R₁, x)
    R₀′ <= 0 && return R₀, R₁, zero(T)
    R₁′ <= 0 && return R₀, R₁, zero(T)
    return R₀′, R₁′, y
end

function Γ⁻(r::Reserves, x::T) where T
    # prevent division by zero
    -x <= 0.9r.R₀ || return r.R₀, r.R₁, zero(T)
    R₀′, R₁′, y = Γ(r.R₀, r.R₁, x)
    R₀′ <= 0 && return r.R₀, r.R₁, zero(T)
    R₁′ <= 0 && return r.R₀, r.R₁, zero(T)
    r.ω₁ + y < 0 && return r.R₀, r.R₁, zero(T)
    return R₀′, R₁′, y
end

function Γ⁺(r::Reserves, x::T) where T
    # prevent division by zero
    x <= 0.9r.R₀ || return r.R₀, r.R₁, zero(T)
    # α = 1 - (r.α * (1 / max(1., log10(r.vol_acc))))
    α = 1 - (r.α * r.R₁ / r.R₁init)
    αR₀′, αR₁′, y = Γ(α * r.R₀, α * r.R₁, x)
    R₀′ = r.R₀ + x
    R₁′ = (αR₁′ / αR₀′) * R₀′
    R₀′ <= 0 && return r.R₀, r.R₁, zero(T)
    R₁′ <= 0 && return r.R₀, r.R₁, zero(T)
    r.ω₁ + y < 0 && return r.R₀, r.R₁, zero(T)
    return R₀′, R₁′, y
end

function (r::Reserves)(x::T) where T
    if x >= zero(T)
        R₀′, R₁′, y = Γ⁺(r, x)
        r.R₀ = R₀′
        r.R₁ = R₁′
        r.ω₁ += y
    else
        R₀′, R₁′, y = Γ⁻(r, x)
        r.R₀ = R₀′
        r.R₁ = R₁′
        r.ω₁ += y
    end
    return 𝑝(r)
end

function 𝑝(r::Reserves)
    return r.R₀ / r.R₁
end

#=
Markets are often assumed to follow some kind of exponential
distribution over their price action, for a specific time
interval (e.g. every 1h price change) with most market
movements of small magnitudes, and rare movements of very
large magnitudes relative to the probability of being drawn
from the gaussian distribution fitted to the data.

      1.) Naive expected price distribution following a gaussian:
         |---------------------------------|
         |               :::               |
         |             ::   ::             |
         |            :       :            |
         |           :         :           |
         |          ::         ::          |
         |          :           :          |
         |         :             :         |
         |        ::             ::        |
         |      :::               :::      |
         |   ::::                   ::::   |
         |----------------|----------------|
        -10               0                10

      2.) Actual price distribution following an exponential with
         long tails due to the frequency of critical events:
         |-------------------------------|
         |               :               |
         |              :::              |
         |             :: ::             |
         |            ::   ::            |
         |           ::     ::           |
         |         :::       :::         |
         |      ::::           ::::      |
         |  :::::                 :::::  |
         |---------------|---------------|
        -10              0               10
=#
rgen(n) = rand(Laplace(0,1000), n)

function rwalk_cp(R₀::T, R₁::T, n::Int) where T
    prices = zeros(T, n)
    acc_vol = zeros(T, n)
    xs = rgen(n)
    ω₁ = 0.0
    for i = 1:n
        R₀, R₁, y = 𝑐𝑝(R₀, R₁, xs[i])
        if y < 0 && abs(y) > ω₁
            continue
        end
        prices[i] = R₀ / R₁
        ω₁ += y
        if i == 1
            acc_vol[i] = abs(xs[i])
            continue
        end

        acc_vol[i] = acc_vol[i-1] + abs(xs[i])
    end
    return prices, acc_vol, R₀, R₁
end

function rwalk_SBC(R₀::T, R₁::T, α::T, n::Int) where T
    prices = zeros(T, n)
    acc_vol = zeros(T, n)
    r = Reserves(R₀, R₁, R₁/10., R₁, α)
    xs = rgen(n)
    for i = 1:n
        price = r(xs[i])
        prices[i] = price
        if i == 1
            acc_vol[i] = abs(xs[i])
            continue
        end
        acc_vol[i] = acc_vol[i-1] + abs(xs[i])
    end
    return prices, acc_vol, r
end

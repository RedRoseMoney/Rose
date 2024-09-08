using Distributions, Zygote, Plots

#=
The subscript ₀ and ₁ are used to parametrize between the two tokens,
the superscript ′ denotes an updated value,
ω denotes a portfolio (ω₀, ω₁),
the superscript ⁺ is used to indicate the value in native currency of a pair (ω₀, ω₁),
ϕ is the fee slashed on market sell orders.
=#

"""
    spot(R₀, R₁)

returns the current spot price of `y` denominated in `x`.
"""
spot(R₀, R₁) = R₀ / R₁

"""
    Γ(R₀, R₁, x)

Given reserves (`R₀`, `R₁`) and a trade amount `x` of `R₀`, returns the new reserves `R₀′`, `R₁′`, and the amount of `y` out,
using the update rule:
    
    (R₀ + x) * (R₁ - y) = K

where
    `K = R₀ * R₁`.
"""
function Γ(R₀::T, R₁::T, x::T) where {T}
    # prevent division by zero
    -x < 0.9R₀ || return NaN, NaN, NaN
    K = R₀ * R₁
    R₀′ = R₀ + x
    R₁′ = K / R₀′
    return R₀′, R₁′, R₁ - R₁′
end

"""
    abc(α, ϕ, R₀, R₁, x)

execute a swap against a liquidity pool `(R₀, R₁)`.

`x >= 0` means a buy order of token₁ with `x` units of token₀,

`x < 0` is a sell order of token₁ for `-x` units of token₀.
"""
function abc(α::T, ϕ::T, R₀::T, R₁::T, x::T) where {T<:Real}
    if !(zero(T) <= α <= one(T)) || !(zero(T) <= ϕ <= one(T))
        error("reserve cut factor and slash factor must be ∈ [0,1]")
    end

    if x >= zero(T)
        inv_α = one(T) - α
        # Execute buy orders on cut reserves
        hR₀′, hR₁′, y = Γ(inv_α * R₀, inv_α * R₁, x)
        # get new reserves ratio p, provide liquidity following
        # the new ratio.
        p = spot(hR₁′, hR₀′)
        R₀′ = R₀ + x
        R₁′ = R₀ * p
    else
        R₀′, R₁′, y = Γ(R₀, R₁, x)
        y = y * (1 - ϕ)
    end
    return R₀′, R₁′, y
end

"""
    abc(α, ϕ, ω₀lp, ω₁lp, ω₀trader, ω₁trader, R₀, R₁, x)

execute a swap against a liquidity pool `(R₀, R₁)` and update lp and trader portfolios.

`x >= 0` means a buy order of token₁ with `x` units of token₀,

`x < 0` is a sell order of token₁ for `-x` units of token₀.
"""
function abc(α::T, ϕ::T, ω₀lp::T, ω₁lp::T, ω₀trader::T, ω₁trader::T, R₀::T, R₁::T, x::T) where {T<:Real}
    if !(zero(T) <= α <= one(T)) || !(zero(T) <= ϕ <= one(T))
        error("reserve cut factor and slash factor must be ∈ [0,1]")
    end

    if x >= zero(T)
        inv_α = one(T) - α
        # Execute buy orders on cut reserves
        hR₀′, hR₁′, y = Γ(inv_α * R₀, inv_α * R₁, x)
        # get new reserves ratio p, provide liquidity following
        # the new ratio, and add the excess y to the LP portfolio 
        p = spot(hR₁′, hR₀′)
        R₀′ = R₀ + x
        R₁′ = R₀′ * p
        # Total available R₁ liquidity after swap:
        #     R₁ - y
        # liquidity in pool after swap:
        #     R₁′ = R₀′ * p
        ω₁lp += R₁ - y - R₁′
    else
        # Execute sell orders on full reserves, take slash fee
        # to be distributed to the LP portfolio
        R₀′, R₁′, y = Γ(R₀, R₁, x)
        ω₀lp -= x * ϕ
        y = y * (1 - ϕ)
    end
    ω₀trader -= x
    ω₁trader += y
    return ω₀lp, ω₁lp, ω₀trader, ω₁trader, R₀′, R₁′, y
end

function abc(α::T, ϕ::T, R₀::T, R₁::T, xs::Array{T}) where {T<:Real}
    y::T = zero(T)
    for xᵢ in xs
        R₀, R₁, _y = abc(α, ϕ, R₀, R₁, xᵢ)
        y += _y
    end
    return R₀, R₁, y
end

function abc(α::T, ϕ::T, ω₀lp::T, ω₁lp::T, ω₀trader::T, ω₁trader::T, R₀::T, R₁::T, xs::Array{T}) where {T<:Real}
    y::T = zero(T)
    for xᵢ in xs
        ω₀lp, ω₁lp, ω₀trader, ω₁trader, R₀, R₁, _y = abc(α, ϕ, ω₀lp, ω₁lp, ω₀trader, ω₁trader, R₀, R₁, xᵢ)
        y += _y
    end
    return ω₀lp, ω₁lp, ω₀trader, ω₁trader, R₀, R₁, y
end

"""
    ω⁺lp(ω₀lp, ω₁lp, ω₀trader, ω₁trader, R₀, R₁, x)

Denominate the total value of a portfolio (ω₀, ω₁) in native currency.
"""
function ω⁺value(R₁::T, R₀::T, ω₀::T, ω₁::T, ϕ::T) where {T<:Real}
    _, _, ω₁_in_ω₀ = Γ(R₁, R₀, (1 - ϕ) * ω₁)
    return ω₀ + ω₁_in_ω₀
end

"""
    Φ(α, ϕ, ω₀lp, ω₁lp, ω₀trader, ω₁trader, R₀, R₁, x)

lookup that executes a swap of x units of token₀,
and returns the total native value of:
- updated LP portfolio value `ω⁺lp′`
- updated trader portfolio value `ω⁺trader′`
- amount in/out of token₁ `y`
- spot price of token₁ `p′`
- Market liquidity `R⁺′`
"""
function Φ(α, ϕ, ω₀lp, ω₁lp, ω₀trader, ω₁trader, R₀, R₁, x)
    ω₀lp′, ω₁lp′, ω₀trader′, ω₁trader′, R₀′, R₁′, y = abc(α, ϕ, ω₀lp, ω₁lp, ω₀trader, ω₁trader, R₀, R₁, x)
    ω⁺lp′ = ω⁺value(R₀′, R₁′, ω₀lp′, ω₁lp′, ϕ)
    ω⁺trader′ = ω⁺value(R₀′, R₁′, ω₀trader′, ω₁trader′, ϕ)
    p′ = spot(R₀′, R₁′)
    R⁺′ = R₀′ + R₁′ * spot(R₁′, R₀′)
    return ω⁺lp′, ω⁺trader′, y, p′, R⁺′
end

"""
    Φ(α, ϕ, ω₀lp, ω₁lp, ω₀trader, ω₁trader, R₀, R₁)

lookup that returns the total native value of:
- LP portfolio value `ω⁺lp`
- trader portfolio value `ω⁺trader`
- spot price of token₁ `p`
- Market liquidity `R⁺`
"""
function Φ(α, ϕ, ω₀lp, ω₁lp, ω₀trader, ω₁trader, R₀, R₁)
    ω⁺lp = ω⁺value(R₀, R₁, ω₀lp, ω₁lp, ϕ)
    ω⁺trader = ω⁺value(R₀, R₁, ω₀trader, ω₁trader, ϕ)
    p = spot(R₀, R₁)
    R⁺ = R₀ + R₁ * spot(R₁, R₀)
    return ω⁺lp, ω⁺trader, p, R⁺
end

